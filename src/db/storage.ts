/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, WorkSession, PauseSession, AppSettings, DatabaseExport } from '../types';

const STORAGE_KEY = 'premium_tracker_db';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'system',
  appearance: 'black-white',
  currency: 'USD',
};

// Generates some high-quality initial data so the app displays gorgeous stats immediately
const getInitialDatabase = (): DatabaseExport => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const projects: Project[] = [
    {
      id: 'proj_1',
      name: 'Android Redevelopment',
      description: 'Major rewrite of the core native application using Jetpack Compose and clean architecture.',
      hourlyRate: 150,
      clientName: 'Google Cloud EMEA',
      imagePath: 'assets/projects/android_redev.png',
      createdAt: now - 30 * dayMs,
    },
    {
      id: 'proj_2',
      name: 'UI/UX Brand Audit',
      description: 'Conducting visual reviews, typographic restructuring, and performance optimization.',
      hourlyRate: 200,
      clientName: 'Aesthetic Partners LLC',
      imagePath: 'assets/projects/ui_audit.png',
      createdAt: now - 15 * dayMs,
    },
    {
      id: 'proj_3',
      name: 'Tax & Compliance Audit',
      description: 'Reviewing quarterly logs and compiling multi-sheet financial sheets.',
      hourlyRate: 95,
      clientName: 'Shalem & Co. Legal',
      imagePath: 'assets/projects/legal.png',
      createdAt: now - 5 * dayMs,
    }
  ];

  // Create sample sessions over the last 3 days
  const workSessions: WorkSession[] = [
    // Today
    {
      id: 'sess_1',
      projectId: 'proj_1',
      startTime: now - 4 * 60 * 60 * 1000, // 4 hours ago
      endTime: now - 1.5 * 60 * 60 * 1000,  // finished 1.5 hours ago (2.5 hr duration)
      totalWorkedSeconds: 8400, // 2h 20m (with a 10 min break accounted for in PauseSession)
      createdAt: now - 4 * 60 * 60 * 1000,
    },
    // Yesterday
    {
      id: 'sess_2',
      projectId: 'proj_2',
      startTime: now - dayMs - 6 * 60 * 60 * 1000,
      endTime: now - dayMs - 2 * 60 * 60 * 1000, // 4 hours duration
      totalWorkedSeconds: 14400, // 4 hours flat
      createdAt: now - dayMs - 6 * 60 * 60 * 1000,
    },
    // 3 days ago
    {
      id: 'sess_3',
      projectId: 'proj_1',
      startTime: now - 2 * dayMs - 5 * 60 * 60 * 1000,
      endTime: now - 2 * dayMs - 1 * 60 * 60 * 1000, // 4 hours duration
      totalWorkedSeconds: 12600, // 3.5 hours (30 min pause)
      createdAt: now - 2 * dayMs - 5 * 60 * 60 * 1000,
    },
    // 4 days ago
    {
      id: 'sess_4',
      projectId: 'proj_3',
      startTime: now - 3 * dayMs - 3 * 60 * 60 * 1000,
      endTime: now - 3 * dayMs - 1 * 60 * 60 * 1000, // 2 hours
      totalWorkedSeconds: 7200, // 2 hours flat
      createdAt: now - 3 * dayMs - 3 * 60 * 60 * 1000,
    }
  ];

  const pauseSessions: PauseSession[] = [
    {
      id: 'pause_1',
      workSessionId: 'sess_1',
      pauseStart: now - 3 * 60 * 60 * 1000,
      pauseEnd: now - 2.833 * 60 * 60 * 1000, // paused for 10 min
    },
    {
      id: 'pause_2',
      workSessionId: 'sess_3',
      pauseStart: now - 2 * dayMs - 3.5 * 60 * 60 * 1000,
      pauseEnd: now - 2 * dayMs - 3 * 60 * 60 * 1000, // paused for 30 min
    }
  ];

  return {
    projects,
    workSessions,
    pauseSessions,
    settings: DEFAULT_SETTINGS,
  };
};

export const getDb = (): DatabaseExport => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const init = getInitialDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading DB, resetting to initial', e);
    const init = getInitialDatabase();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
};

export const saveDb = (db: DatabaseExport) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const getProjects = (): Project[] => getDb().projects;

export const saveProject = (project: Project) => {
  const db = getDb();
  const idx = db.projects.findIndex((p) => p.id === project.id);
  if (idx > -1) {
    db.projects[idx] = project;
  } else {
    db.projects.push(project);
  }
  saveDb(db);
};

export const deleteProject = (projectId: string) => {
  const db = getDb();
  db.projects = db.projects.filter((p) => p.id !== projectId);
  // Cascading deletes for sessions
  const sessionsToDelete = db.workSessions.filter((s) => s.projectId === projectId).map((s) => s.id);
  db.workSessions = db.workSessions.filter((s) => s.projectId !== projectId);
  db.pauseSessions = db.pauseSessions.filter((p) => !sessionsToDelete.includes(p.workSessionId));
  saveDb(db);
};

export const getWorkSessions = (): WorkSession[] => getDb().workSessions;

export const saveWorkSession = (session: WorkSession) => {
  const db = getDb();
  const idx = db.workSessions.findIndex((s) => s.id === session.id);
  if (idx > -1) {
    db.workSessions[idx] = session;
  } else {
    db.workSessions.push(session);
  }
  saveDb(db);
};

export const getPauseSessions = (): PauseSession[] => getDb().pauseSessions;

export const savePauseSession = (pause: PauseSession) => {
  const db = getDb();
  const idx = db.pauseSessions.findIndex((p) => p.id === pause.id);
  if (idx > -1) {
    db.pauseSessions[idx] = pause;
  } else {
    db.pauseSessions.push(pause);
  }
  saveDb(db);
};

export const getSettings = (): AppSettings => {
  const db = getDb();
  return db.settings || DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  const db = getDb();
  db.settings = settings;
  saveDb(db);
};
