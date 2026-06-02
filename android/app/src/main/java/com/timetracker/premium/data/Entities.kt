package com.timetracker.premium.data

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
    val endTime: Long?, // null if active
    val totalWorkedSeconds: Long, // cumulative worked seconds excluding pauses
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
    val pauseEnd: Long? // null if currently paused
)
