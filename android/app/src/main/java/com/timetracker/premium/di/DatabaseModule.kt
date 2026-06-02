package com.timetracker.premium.di

import android.content.Context
import androidx.room.Room
import com.timetracker.premium.data.AppDatabase
import com.timetracker.premium.data.PauseSessionDao
import com.timetracker.premium.data.ProjectDao
import com.timetracker.premium.data.WorkSessionDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "premium_time_tracker.db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideProjectDao(database: AppDatabase): ProjectDao {
        return database.projectDao()
    }

    @Provides
    fun provideWorkSessionDao(database: AppDatabase): WorkSessionDao {
        return database.workSessionDao()
    }

    @Provides
    fun providePauseSessionDao(database: AppDatabase): PauseSessionDao {
        return database.pauseSessionDao()
    }
}
