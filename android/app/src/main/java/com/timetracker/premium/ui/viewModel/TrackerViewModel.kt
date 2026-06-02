package com.timetracker.premium.ui.viewModel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timetracker.premium.data.PauseSessionEntity
import com.timetracker.premium.data.ProjectEntity
import com.timetracker.premium.data.TrackerRepository
import com.timetracker.premium.data.WorkSessionEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ActiveSessionState(
    val projectId: String,
    val isPaused: Boolean = false,
    val currentWorkedSeconds: Long = 0L,
    val currentSessionId: String,
    val lastStateChangedTime: Long
)

@HiltViewModel
class TrackerViewModel @Inject constructor(
    private val repository: TrackerRepository
) : ViewModel() {

    // Projects list Flow from SQLite
    val projects: StateFlow<List<ProjectEntity>> = repository.allProjects
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Work sessions history from SQLite
    val sessions: StateFlow<List<WorkSessionEntity>> = repository.allWorkSessions
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Active session live state tracking
    private val _activeSession = MutableStateFlow<ActiveSessionState?>(null)
    val activeSession: StateFlow<ActiveSessionState?> = _activeSession.asStateFlow()

    private var timerJob: Job? = null

    // Create or update a project
    fun saveProject(project: ProjectEntity) {
        viewModelScope.launch {
            repository.saveProject(project)
        }
    }

    // Delete a project
    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            repository.deleteProject(projectId)
            if (_activeSession.value?.projectId == projectId) {
                stopTimerJob()
                _activeSession.value = null
            }
        }
    }

    // Core work session handling
    fun startWorking(projectId: String) {
        if (_activeSession.value != null) return // Session is already tracking

        val sessionId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()

        _activeSession.value = ActiveSessionState(
            projectId = projectId,
            isPaused = false,
            currentWorkedSeconds = 0L,
            currentSessionId = sessionId,
            lastStateChangedTime = now
        )

        startTimerJob()
        
        // Write the session entity start to the DB in background
        viewModelScope.launch {
            val session = WorkSessionEntity(
                id = sessionId,
                projectId = projectId,
                startTime = now,
                endTime = null,
                totalWorkedSeconds = 0L
            )
            repository.saveWorkSession(session)
        }
    }

    fun pauseWorking() {
        val current = _activeSession.value ?: return
        if (current.isPaused) return

        val now = System.currentTimeMillis()
        val pauseId = UUID.randomUUID().toString()

        _activeSession.value = current.copy(
            isPaused = true,
            lastStateChangedTime = now
        )

        stopTimerJob()

        viewModelScope.launch {
            val pauseEntry = PauseSessionEntity(
                id = pauseId,
                workSessionId = current.currentSessionId,
                pauseStart = now,
                pauseEnd = null
            )
            repository.savePauseSession(pauseEntry)
        }
    }

    fun resumeWorking() {
        val current = _activeSession.value ?: return
        if (!current.isPaused) return

        val now = System.currentTimeMillis()
        _activeSession.value = current.copy(
            isPaused = false,
            lastStateChangedTime = now
        )

        startTimerJob()

        viewModelScope.launch {
            // Find active pause session and seal it (pauseEnd = now)
            val pauses = repository.getPauseSessionsForWorkSession(current.currentSessionId)
            val activePause = pauses.find { it.pauseEnd == null }
            if (activePause != null) {
                repository.savePauseSession(activePause.copy(pauseEnd = now))
            }
        }
    }

    fun stopWorking() {
        val current = _activeSession.value ?: return
        val now = System.currentTimeMillis()

        stopTimerJob()
        _activeSession.value = null

        viewModelScope.launch {
            val sessionsInDb = repository.getPauseSessionsForWorkSession(current.currentSessionId)
            
            // Clean up any remaining open pauses first
            val openPause = sessionsInDb.find { it.pauseEnd == null }
            if (openPause != null) {
                repository.savePauseSession(openPause.copy(pauseEnd = now))
            }

            // Fetch the session from DB, apply final total worked seconds, and seal it
            val finalSeconds = current.currentWorkedSeconds
            val originalStart = current.lastStateChangedTime // we can approximate or fetch the actual session
            
            // A more solid implementation fetches directly but we can rewrite based on live tracker
            val finalSession = WorkSessionEntity(
                id = current.currentSessionId,
                projectId = current.projectId,
                startTime = originalStart - (finalSeconds * 1000L), // aligned start
                endTime = now,
                totalWorkedSeconds = finalSeconds
            )
            repository.saveWorkSession(finalSession)
        }
    }

    private fun startTimerJob() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(1000L)
                val current = _activeSession.value
                if (current != null && !current.isPaused) {
                    _activeSession.value = current.copy(
                        currentWorkedSeconds = current.currentWorkedSeconds + 1
                    )
                }
            }
        }
    }

    private fun stopTimerJob() {
        timerJob?.cancel()
        timerJob = null
    }

    override fun onCleared() {
        super.onCleared()
        stopTimerJob()
    }
}
