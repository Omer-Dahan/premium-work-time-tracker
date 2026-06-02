/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, FileCode, Folder, ChevronRight, Download } from 'lucide-react';

interface CodeFile {
  name: string;
  path: string;
  language: string;
  code: string;
}

export default function AndroidCodeExplorer() {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const files: CodeFile[] = [
    {
      name: 'Entities.kt',
      path: 'app/src/main/java/com/timetracker/premium/data/Entities.kt',
      language: 'kotlin',
      code: `package com.timetracker.premium.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "projects")
data class ProjectEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String,
    val hourlyRate: Double?,
    val clientName: String?,
    val imagePath: String?,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "work_sessions",
    foreignKeys = [
        ForeignKey(
            entity = ProjectEntity::class,
            parentColumns = ["id"],
            childColumns = ["projectId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["projectId"])]
)
data class WorkSessionEntity(
    @PrimaryKey
    val id: String,
    val projectId: String,
    val startTime: Long,
    val endTime: Long?,
    val totalWorkedSeconds: Long,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "pause_sessions",
    foreignKeys = [
        ForeignKey(
            entity = WorkSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["workSessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["workSessionId"])]
)
data class PauseSessionEntity(
    @PrimaryKey
    val id: String,
    val workSessionId: String,
    val pauseStart: Long,
    val pauseEnd: Long?
)`
    },
    {
      name: 'TrackerViewModel.kt',
      path: 'app/src/main/java/com/timetracker/premium/ui/viewModel/TrackerViewModel.kt',
      language: 'kotlin',
      code: `package com.timetracker.premium.ui.viewModel

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

    val projects: StateFlow<List<ProjectEntity>> = repository.allProjects
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val sessions: StateFlow<List<WorkSessionEntity>> = repository.allWorkSessions
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    private val _activeSession = MutableStateFlow<ActiveSessionState?>(null)
    val activeSession: StateFlow<ActiveSessionState?> = _activeSession.asStateFlow()

    private var timerJob: Job? = null

    fun startWorking(projectId: String) {
        if (_activeSession.value != null) return
        val sessionId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()

        _activeSession.value = ActiveSessionState(
            projectId = projectId,
            currentSessionId = sessionId,
            lastStateChangedTime = now
        )
        startTimerJob()
        
        viewModelScope.launch {
            repository.saveWorkSession(WorkSessionEntity(sessionId, projectId, now, null, 0L))
        }
    }

    fun pauseWorking() {
        val current = _activeSession.value ?: return
        if (current.isPaused) return
        val now = System.currentTimeMillis()

        _activeSession.value = current.copy(isPaused = true, lastStateChangedTime = now)
        stopTimerJob()

        viewModelScope.launch {
            repository.savePauseSession(PauseSessionEntity(UUID.randomUUID().toString(), current.currentSessionId, now, null))
        }
    }

    fun resumeWorking() {
        val current = _activeSession.value ?: return
        if (!current.isPaused) return
        val now = System.currentTimeMillis()

        _activeSession.value = current.copy(isPaused = false, lastStateChangedTime = now)
        startTimerJob()

        viewModelScope.launch {
            val pauses = repository.getPauseSessionsForWorkSession(current.currentSessionId)
            pauses.find { it.pauseEnd == null }?.let {
                repository.savePauseSession(it.copy(pauseEnd = now))
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
            sessionsInDb.find { it.pauseEnd == null }?.let {
                repository.savePauseSession(it.copy(pauseEnd = now))
            }
            repository.saveWorkSession(WorkSessionEntity(current.currentSessionId, current.projectId, current.lastStateChangedTime - (current.currentWorkedSeconds * 1000L), now, current.currentWorkedSeconds))
        }
    }

    private fun startTimerJob() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(1000L)
                _activeSession.value?.let {
                    if (!it.isPaused) _activeSession.value = it.copy(currentWorkedSeconds = it.currentWorkedSeconds + 1)
                }
            }
        }
    }

    private fun stopTimerJob() {
        timerJob?.cancel()
        timerJob = null
    }
}`
    },
    {
      name: 'ExcelExporter.kt',
      path: 'app/src/main/java/com/timetracker/premium/export/ExcelExporter.kt',
      language: 'kotlin',
      code: `package com.timetracker.premium.export

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.timetracker.premium.data.ProjectEntity
import com.timetracker.premium.data.WorkSessionEntity
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ExcelExporter {
    fun exportToExcelAndShare(context: Context, projects: List<ProjectEntity>, sessions: List<WorkSessionEntity>) {
        val workbook = XSSFWorkbook()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val dateDayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

        // Sheet 1: Detailed Sessions
        val sheet1 = workbook.createSheet("Detailed Sessions")
        val header1 = sheet1.createRow(0)
        listOf("Date", "Start Time", "End Time", "Worked Duration (h)", "Project Name", "Notes").forEachIndexed { i, h ->
            header1.createCell(i).setCellValue(h)
        }

        sessions.forEachIndexed { idx, sess ->
            val proj = projects.find { it.id == sess.projectId } ?: return@forEachIndexed
            val row = sheet1.createRow(idx + 1)
            row.createCell(0).setCellValue(dateDayFormat.format(Date(sess.startTime)))
            row.createCell(1).setCellValue(dateFormat.format(Date(sess.startTime)))
            row.createCell(2).setCellValue(sess.endTime?.let { dateFormat.format(Date(it)) } ?: "Active")
            row.createCell(3).setCellValue(sess.totalWorkedSeconds.toDouble() / 3600.0)
            row.createCell(4).setCellValue(proj.name)
            row.createCell(5).setCellValue("UID: " + sess.id)
        }

        // Sheet 2: Summary
        val sheet2 = workbook.createSheet("Summary")
        val header2 = sheet2.createRow(0)
        listOf("Project", "Total Hours", "Hourly Rate", "Estimated Revenue").forEachIndexed { i, h ->
            header2.createCell(i).setCellValue(h)
        }

        projects.forEachIndexed { idx, proj ->
            val projSec = sessions.filter { it.projectId == proj.id }.sumOf { it.totalWorkedSeconds }
            val hours = projSec.toDouble() / 3600.0
            val rate = proj.hourlyRate ?: 0.0
            val row = sheet2.createRow(idx + 1)
            row.createCell(0).setCellValue(proj.name)
            row.createCell(1).setCellValue(hours)
            row.createCell(2).setCellValue(rate)
            row.createCell(3).setCellValue(hours * rate)
        }

        val cacheFile = File(context.cacheDir, "premium_sessions_\${System.currentTimeMillis()}.xlsx")
        FileOutputStream(cacheFile).use { workbook.write(it) }
        workbook.close()

        val uri = FileProvider.getUriForFile(context, "\${context.packageName}.fileprovider", cacheFile)
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(shareIntent, "Share XLSX Report"))
    }
}`
    },
    {
      name: 'AppDatabase.kt',
      path: 'app/src/main/java/com/timetracker/premium/data/AppDatabase.kt',
      language: 'kotlin',
      code: `package com.timetracker.premium.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Dao
interface ProjectDao {
    @Query("SELECT * FROM projects ORDER BY createdAt DESC")
    fun getAllProjects(): Flow<List<ProjectEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProject(project: ProjectEntity)

    @Query("DELETE FROM projects WHERE id = :id")
    suspend fun deleteProjectById(id: String)
}

@Dao
interface WorkSessionDao {
    @Query("SELECT * FROM work_sessions ORDER BY startTime DESC")
    fun getAllWorkSessions(): Flow<List<WorkSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkSession(session: WorkSessionEntity)

    @Delete
    suspend fun deleteWorkSession(session: WorkSessionEntity)
}

@Database(entities = [ProjectEntity::class, WorkSessionEntity::class, PauseSessionEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun projectDao(): ProjectDao
    abstract fun workSessionDao(): WorkSessionDao
    abstract fun pauseSessionDao(): PauseSessionDao
}`
    },
    {
      name: 'Repository.kt',
      path: 'app/src/main/java/com/timetracker/premium/data/Repository.kt',
      language: 'kotlin',
      code: `package com.timetracker.premium.data

import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackerRepository @Inject constructor(
    private val projectDao: ProjectDao,
    private val workSessionDao: WorkSessionDao,
    private val pauseSessionDao: PauseSessionDao
) {
    val allProjects: Flow<List<ProjectEntity>> = projectDao.getAllProjects()
    val allWorkSessions: Flow<List<WorkSessionEntity>> = workSessionDao.getAllWorkSessions()

    suspend fun saveProject(project: ProjectEntity) = projectDao.insertProject(project)
    suspend fun deleteProject(id: String) = projectDao.deleteProjectById(id)
    suspend fun saveWorkSession(s: WorkSessionEntity) = workSessionDao.insertWorkSession(s)
    suspend fun getPauseSessionsForWorkSession(id: String) = pauseSessionDao.getPauseSessionsForWorkSession(id)
    suspend fun savePauseSession(p: PauseSessionEntity) = pauseSessionDao.insertPauseSession(p)
}`
    },
    {
      name: 'strings.xml (iw)',
      path: 'app/src/main/res/values-he/strings.xml',
      language: 'xml',
      code: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">מעקב זמן יוקרתי</string>
    <string name="dashboard">לוח בקרה</string>
    <string name="projects">פרויקטים</string>
    <string name="reports">דוחות</string>
    <string name="settings">הגדרות</string>
    <string name="start_working">התחל עבודה</string>
    <string name="pause">השהה</string>
    <string name="resume">המשך</string>
    <string name="stop">עצור</string>
    <string name="total_time_worked">סך הכל זמן עבודה</string>
    <string name="hourly_rate">תעריף לשעה</string>
    <string name="client_name">לקוח</string>
    <string name="export_to_excel">ייצוא לאקסל (XLSX)</string>
    <string name="privacy_policy_desc">האפליקציה פועלת באופן מקומי לחלוטין. הנתונים אינם יוצאים מהמכשיר.</string>
</resources>`
    },
    {
      name: 'build.gradle.kts',
      path: 'app/build.gradle.kts',
      language: 'gradle',
      code: `// Core app dependencies
dependencies {
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("com.google.dagger:hilt-android:2.50")
    implementation("org.apache.poi:poi-ooxml:5.2.5")
}`
    }
  ];

  const currentFile = files[selectedFileIdx];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] text-gray-200 font-sans border border-neutral-800 rounded-2xl overflow-hidden self-stretch" id="android-code-explorer-container">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]" id="explorer-header">
        <div className="flex items-center gap-3">
          <Folder className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white">Kotlin Room/Compose Code Explorer</h3>
            <p className="text-xs text-neutral-500 font-mono">/android/app/src/main/java/...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
            id="copy-code-btn"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden h-[500px]" id="explorer-body">
        {/* Left Side Tree */}
        <div className="w-72 border-r border-neutral-800 bg-[#161616] overflow-y-auto p-4 flex flex-col gap-1" id="explorer-sidebar">
          <span className="text-xs font-bold tracking-wider text-neutral-500 uppercase px-2 mb-2 block">
            SOURCE FILE DIRECTORY
          </span>
          {files.map((file, idx) => (
            <button
              key={file.name}
              onClick={() => {
                setSelectedFileIdx(idx);
                setCopied(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                selectedFileIdx === idx
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-white'
              }`}
              id={`file-tab-${idx}`}
            >
              <FileCode className={`w-4 h-4 ${selectedFileIdx === idx ? 'text-black' : 'text-neutral-500'}`} />
              <div className="truncate flex-1">
                <span className="block text-xs truncate leading-tight">{file.name}</span>
                <span className={`block text-[10px] truncate leading-tight ${selectedFileIdx === idx ? 'text-neutral-600' : 'text-neutral-500'}`}>
                  {file.path.split('/').pop()}
                </span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${selectedFileIdx === idx ? 'translate-x-0.5' : 'opacity-0 hover:opacity-100'}`} />
            </button>
          ))}
          
          <div className="mt-auto pt-6 border-t border-neutral-800/80 px-2" id="android-zip-instruction">
            <div className="rounded-xl bg-neutral-900 p-3 border border-neutral-800/40">
              <div className="flex items-center gap-2 text-white mb-1.5">
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">ZIP Export Ready</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-normal">
                These actual Android native `.kt`, `.xml`, package and `.gradle` files are written inside the workspace `/android` directory. Export this project as ZIP via settings to open it in Android Studio.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side Code View */}
        <div className="flex-1 bg-[#0b0b0b] overflow-auto flex flex-col" id="code-content-view">
          {/* File path top rail */}
          <div className="px-5 py-2.5 bg-[#0e0e0e] border-b border-neutral-900/50 flex items-center justify-between" id="code-top-rail">
            <span className="text-[10px] font-mono text-neutral-500 shrink-0 select-all hover:text-neutral-300 transition-colors">
              {currentFile.path}
            </span>
            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-md font-mono shrink-0">
              {currentFile.language}
            </span>
          </div>

          {/* Actual Code */}
          <pre className="p-6 font-mono text-xs overflow-auto leading-relaxed text-gray-300 select-text selection:bg-neutral-800 selection:text-white flex-1" id="code-editor-renderer">
            <code>{currentFile.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
