package com.timetracker.premium.data

import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackerRepository @Inject constructor(
    private val projectDao: ProjectDao,
    private val workSessionDao: WorkSessionDao,
    private val pauseSessionDao: PauseSessionDao
) {
    // Project operations
    val allProjects: Flow<List<ProjectEntity>> = projectDao.getAllProjects()

    suspend fun saveProject(project: ProjectEntity) {
        projectDao.insertProject(project)
    }

    suspend fun deleteProject(id: String) {
        projectDao.deleteProjectById(id)
    }

    // Work Sessions operations
    val allWorkSessions: Flow<List<WorkSessionEntity>> = workSessionDao.getAllWorkSessions()

    fun getWorkSessionsForProject(projectId: String): Flow<List<WorkSessionEntity>> {
        return workSessionDao.getWorkSessionsForProject(projectId)
    }

    suspend fun saveWorkSession(session: WorkSessionEntity) {
        workSessionDao.insertWorkSession(session)
    }

    suspend fun deleteWorkSession(session: WorkSessionEntity) {
        workSessionDao.deleteWorkSession(session)
    }

    // Pause Sessions operations
    val allPauseSessions: Flow<List<PauseSessionEntity>> = pauseSessionDao.getAllPauseSessions()

    suspend fun getPauseSessionsForWorkSession(workSessionId: String): List<PauseSessionEntity> {
        return pauseSessionDao.getPauseSessionsForWorkSession(workSessionId)
    }

    suspend fun savePauseSession(pause: PauseSessionEntity) {
        pauseSessionDao.insertPauseSession(pause)
    }
}
