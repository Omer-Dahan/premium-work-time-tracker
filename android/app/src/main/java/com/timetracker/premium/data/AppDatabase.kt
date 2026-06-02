package com.timetracker.premium.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction
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

    @Query("SELECT * FROM work_sessions WHERE projectId = :projectId ORDER BY startTime DESC")
    fun getWorkSessionsForProject(projectId: String): Flow<List<WorkSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorkSession(session: WorkSessionEntity)

    @Delete
    suspend fun deleteWorkSession(session: WorkSessionEntity)
}

@Dao
interface PauseSessionDao {
    @Query("SELECT * FROM pause_sessions ORDER BY pauseStart DESC")
    fun getAllPauseSessions(): Flow<List<PauseSessionEntity>>

    @Query("SELECT * FROM pause_sessions WHERE workSessionId = :workSessionId ORDER BY pauseStart DESC")
    fun getPauseSessionsForWorkSession(workSessionId: String): List<PauseSessionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPauseSession(pause: PauseSessionEntity)
}

@Database(
    entities = [ProjectEntity::class, WorkSessionEntity::class, PauseSessionEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun projectDao(): ProjectDao
    abstract fun workSessionDao(): WorkSessionDao
    abstract fun pauseSessionDao(): PauseSessionDao
}
