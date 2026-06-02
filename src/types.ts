/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  hourlyRate: number | null;
  clientName: string;
  imagePath: string; // Stored path/base64 for future use
  createdAt: number;
}

export interface WorkSession {
  id: string;
  projectId: string;
  startTime: number;
  endTime: number | null; // null if active
  totalWorkedSeconds: number; // Sum of active durations
  createdAt: number;
}

export interface PauseSession {
  id: string;
  workSessionId: string;
  pauseStart: number;
  pauseEnd: number | null; // null if actively paused
}

export type Language = 'en' | 'he';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AppearanceMode = 'black-white';

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  appearance: AppearanceMode;
  currency?: 'USD' | 'ILS';
}

// Full app state export/import container
export interface DatabaseExport {
  projects: Project[];
  workSessions: WorkSession[];
  pauseSessions: PauseSession[];
  settings: AppSettings;
}
