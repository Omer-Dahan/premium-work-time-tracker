/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getProjects, 
  getWorkSessions, 
  getSettings, 
  saveProject, 
  deleteProject, 
  saveWorkSession, 
  savePauseSession, 
  saveSettings,
  getDb,
  saveDb
} from './db/storage';
import { Project, WorkSession, PauseSession, AppSettings, DatabaseExport } from './types';
import { translations } from './localization';
import PhoneSimulator from './components/PhoneSimulator';
import ProjectsScreen from './components/ProjectsScreen';
import ReportsScreen from './components/ReportsScreen';
import SettingsScreen from './components/SettingsScreen';
import AndroidCodeExplorer from './components/AndroidCodeExplorer';
import { Monitor, Phone, Download, Globe, Code, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function App() {
  // Sync state loops
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [sessionsList, setSessionsList] = useState<WorkSession[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getSettings());
  
  // Tab control inside simulated Android phone
  const [activeTab, setActiveTab] = useState<'projects' | 'reports' | 'settings'>('projects');
  
  // Toggling dual pane (Simulator + Code) vs Full Web App View
  const [fullWebView, setFullWebView] = useState(false);

  // Live active work session tracking with local-storage and time delta recovery
  const [activeSession, setActiveSession] = useState<{
    projectId: string;
    isPaused: boolean;
    currentWorkedSeconds: number;
    currentSessionId: string;
  } | null>(() => {
    const saved = localStorage.getItem('premium_tracker_active_session');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        // Let's calculate the correct delta of time that passed!
        const rawDb = localStorage.getItem('premium_tracker_db');
        if (rawDb) {
          const db = JSON.parse(rawDb);
          const workSession = db.workSessions.find((s: any) => s.id === parsed.currentSessionId);
          if (workSession) {
            if (!parsed.isPaused) {
              // The session was actively running when app closed/interrupted!
              // Worked seconds = (current time - session start time) - summed break durations
              const now = Date.now();
              let totalSecs = Math.floor((now - workSession.startTime) / 1000);
              
              const sessionPauses = db.pauseSessions.filter((p: any) => p.workSessionId === parsed.currentSessionId);
              sessionPauses.forEach((p: any) => {
                if (p.pauseStart && p.pauseEnd) {
                  totalSecs -= Math.floor((p.pauseEnd - p.pauseStart) / 1000);
                }
              });
              parsed.currentWorkedSeconds = Math.max(0, totalSecs);
            }
          }
        }
      }
      return parsed;
    } catch (e) {
      console.error('Error restoring active session:', e);
      return null;
    }
  });

  // Anytime activeSession changes, sync it to localStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('premium_tracker_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('premium_tracker_active_session');
    }
  }, [activeSession]);

  // Initialize DB lists on mount
  useEffect(() => {
    setProjectsList(getProjects());
    setSessionsList(getWorkSessions());
  }, []);

  // Safe digital timer tick interval mechanism 
  const isSessionRunning = activeSession !== null;
  const isSessionPaused = activeSession?.isPaused === true;

  useEffect(() => {
    let interval: any = null;
    if (isSessionRunning && !isSessionPaused) {
      interval = setInterval(() => {
        setActiveSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentWorkedSeconds: prev.currentWorkedSeconds + 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionRunning, isSessionPaused]);

  // Handle active system theme injection
  useEffect(() => {
    const root = document.documentElement;
    const isDark = 
      appSettings.theme === 'dark' || 
      (appSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
      root.style.backgroundColor = '#0b0b0b';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#fdfdfd';
    }
  }, [appSettings.theme]);

  // Translate string definitions
  const t = (key: string): string => {
    const dict = translations[appSettings.language] || translations.en;
    return (dict as any)[key] || (translations.en as any)[key] || key;
  };

  // State manipulation triggers
  const handleSaveProject = (proj: Project) => {
    saveProject(proj);
    setProjectsList(getProjects());
  };

  const handleDeleteProject = (id: string) => {
    // If deleted project is currently working, end session state safely
    if (activeSession?.projectId === id) {
      setActiveSession(null);
    }
    deleteProject(id);
    setProjectsList(getProjects());
    setSessionsList(getWorkSessions());
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setAppSettings(newSettings);
  };

  const handleStartWorking = (projectId: string) => {
    if (activeSession) return; // session already running

    const sessionId = `sess_${Date.now()}`;
    const now = Date.now();

    setActiveSession({
      projectId,
      isPaused: false,
      currentWorkedSeconds: 0,
      currentSessionId: sessionId,
    });

    const newSession: WorkSession = {
      id: sessionId,
      projectId,
      startTime: now,
      endTime: null,
      totalWorkedSeconds: 0,
      createdAt: now,
    };

    saveWorkSession(newSession);
    setSessionsList(getWorkSessions());
  };

  const handlePauseWorking = () => {
    if (!activeSession || activeSession.isPaused) return;

    setActiveSession((prev) => {
      if (!prev) return null;
      return { ...prev, isPaused: true };
    });

    const pauseId = `pause_${Date.now()}`;
    const now = Date.now();

    const newPause: PauseSession = {
      id: pauseId,
      workSessionId: activeSession.currentSessionId,
      pauseStart: now,
      pauseEnd: null,
    };

    savePauseSession(newPause);
  };

  const handleResumeWorking = () => {
    if (!activeSession || !activeSession.isPaused) return;

    setActiveSession((prev) => {
      if (!prev) return null;
      return { ...prev, isPaused: false };
    });

    const now = Date.now();
    const db = getDb();
    
    // Scan for and terminate open pause period
    const activePauseIdx = db.pauseSessions.findIndex(
      (p) => p.workSessionId === activeSession.currentSessionId && p.pauseEnd === null
    );

    if (activePauseIdx > -1) {
      db.pauseSessions[activePauseIdx].pauseEnd = now;
      saveDb(db);
    }
  };

  const handleStopWorking = () => {
    if (!activeSession) return;

    const now = Date.now();
    const finalSeconds = activeSession.currentWorkedSeconds;

    setActiveSession(null);

    const db = getDb();

    // 1. Terminate open pauses
    const openPauseIdx = db.pauseSessions.findIndex(
      (p) => p.workSessionId === activeSession.currentSessionId && p.pauseEnd === null
    );
    if (openPauseIdx > -1) {
      db.pauseSessions[openPauseIdx].pauseEnd = now;
    }

    // 2. Finalize master session
    const sessionIdx = db.workSessions.findIndex((s) => s.id === activeSession.currentSessionId);
    if (sessionIdx > -1) {
      db.workSessions[sessionIdx].endTime = now;
      db.workSessions[sessionIdx].totalWorkedSeconds = finalSeconds;
    }

    saveDb(db);
    setSessionsList(getWorkSessions());
  };

  // Local-first DB backup action
  const handleExportDatabase = () => {
    const rawDb = getDb();
    const jsonStr = JSON.stringify(rawDb, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', dataUri);
    anchor.setAttribute('download', `premium_tracker_backup_${Date.now()}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleImportDatabase = (imported: DatabaseExport) => {
    saveDb(imported);
    setProjectsList(imported.projects);
    setSessionsList(imported.workSessions);
    if (imported.settings) {
      setAppSettings(imported.settings);
    }
  };

  return (
    <div className={`min-h-screen text-gray-100 font-sans ${appSettings.theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f7f7f7]'}`} id="app-root">
      {/* Top Professional Header Bar */}
      <header className="px-8 py-5 border-b border-neutral-200 dark:border-neutral-900 bg-white/70 dark:bg-black/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-50 transition-colors duration-300" id="main-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 select-none" id="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
              <defs>
                <mask id="wt-logo-mask">
                  <rect width="512" height="512" rx="128" fill="white" />
                  <g fill="black">
                    <!-- Stroke 1 (left down-right) -->
                    <polygon points="90,170 130,170 200,335 160,335" />
                    <!-- Stroke 2 (left-mid up-right) -->
                    <polygon points="160,335 200,335 270,170 230,170" />
                    <!-- Stroke 3 (right-mid down-right) -->
                    <polygon points="230,170 270,170 340,335 300,335" />
                    <!-- Stroke 4 (right up-right) -->
                    <polygon points="300,335 340,335 410,170 370,170" />
                    <!-- T-bar (horizontal crossbar centered and extended over the top of Stroke 4) -->
                    <polygon points="327,170 453,170 438.2,205 312.2,205" />
                  </g>
                </mask>
              </defs>
              <rect width="512" height="512" rx="128" fill="currentColor" mask="url(#wt-logo-mask)" className="text-black dark:text-white transition-colors duration-300" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
              Premium Work Time Tracker
            </h1>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
              Android Kotlin - Jetpack Compose Suite
            </p>
          </div>
        </div>

        {/* Floating Layout Toggle View buttons */}
        <div className="flex items-center gap-3" id="layout-toggle-slots">
          <button
            onClick={() => setFullWebView(!fullWebView)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-950 hover:bg-neutral-900 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            id="toggle-full-screen-layout"
          >
            {fullWebView ? (
              <>
                <Phone className="w-4 h-4 shrink-0" />
                <span>Show Companion Code Explorer</span>
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 shrink-0" />
                <span>Full Web Layout</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8" id="container-body">
        {fullWebView ? (
          /* SINGLE VIEW CONTAINER FOR LIGHTWEIGHT DEDICATED PREVIEW */
          <div className="flex items-center justify-center max-w-sm mx-auto" id="standalone-device-flex">
            <PhoneSimulator
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              lang={appSettings.language}
              t={t}
            >
              {activeTab === 'projects' && (
                <ProjectsScreen
                  projects={projectsList}
                  sessions={sessionsList}
                  activeSession={activeSession}
                  onSaveProject={handleSaveProject}
                  onDeleteProject={handleDeleteProject}
                  onStartWorking={handleStartWorking}
                  onPauseWorking={handlePauseWorking}
                  onResumeWorking={handleResumeWorking}
                  onStopWorking={handleStopWorking}
                  t={t}
                  lang={appSettings.language}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsScreen
                  projects={projectsList}
                  sessions={sessionsList}
                  settings={appSettings}
                  t={t}
                  lang={appSettings.language}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsScreen
                  settings={appSettings}
                  onUpdateSettings={handleUpdateSettings}
                  onImportDatabase={handleImportDatabase}
                  onExportDatabase={handleExportDatabase}
                  t={t}
                  lang={appSettings.language}
                />
              )}
            </PhoneSimulator>
          </div>
        ) : (
          /* BALANCED STAGGERED DUAL-PANE VIEW: Left Phone Demo, Right Kotlin Code */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start align-stretch" id="dual-pane-grid">
            {/* Left side Phone Demo Workspace (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-6" id="left-pane-simulation">
              <div className="rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 p-5 flex flex-col gap-3 transition-colors duration-300" id="left-info-banner">
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200" id="banner-headline">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">{t('androidSimulator')}</h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Track project hours in real-time inside our interactive Android emulator! Start/Stop timers, change languages to Hebrew (RTL shifts layout instantly), filter reports, and export actual Excel sheets!
                </p>
                <div className="flex items-center gap-1.5 mt-1" id="banner-features-badges">
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Bilingual RTL-Ready
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Active Tickers
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Room-SQLite Mocked
                  </span>
                </div>
              </div>

              {/* Physical phone device assembly */}
              <div className="w-full flex justify-center" id="phone-mount-point">
                <PhoneSimulator
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  lang={appSettings.language}
                  t={t}
                >
                  {activeTab === 'projects' && (
                    <ProjectsScreen
                      projects={projectsList}
                      sessions={sessionsList}
                      activeSession={activeSession}
                      onSaveProject={handleSaveProject}
                      onDeleteProject={handleDeleteProject}
                      onStartWorking={handleStartWorking}
                      onPauseWorking={handlePauseWorking}
                      onResumeWorking={handleResumeWorking}
                      onStopWorking={handleStopWorking}
                      t={t}
                      lang={appSettings.language}
                    />
                  )}
                  {activeTab === 'reports' && (
                    <ReportsScreen
                      projects={projectsList}
                      sessions={sessionsList}
                      settings={appSettings}
                      t={t}
                      lang={appSettings.language}
                    />
                  )}
                  {activeTab === 'settings' && (
                    <SettingsScreen
                      settings={appSettings}
                      onUpdateSettings={handleUpdateSettings}
                      onImportDatabase={handleImportDatabase}
                      onExportDatabase={handleExportDatabase}
                      t={t}
                      lang={appSettings.language}
                    />
                  )}
                </PhoneSimulator>
              </div>
            </div>

            {/* Right side Kotlin Source Code Explorer (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-6 h-full" id="right-pane-code-explorer">
              <div className="rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900 p-5 flex flex-col gap-3 transition-colors duration-300" id="right-info-banner">
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200" id="code-banner-headline">
                  <Code className="w-5 h-5 text-indigo-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">{t('androidStudioReady')}</h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  The complete production-ready Kotlin source code directories are fully compiled in your workspace! Below is the code navigator showing the modular MVVM layers: Room SQLite entities, Hilt DI dependencies, Apache POI XLSX sheets compiler, and Jetpack Compose themes.
                </p>
                <div className="flex items-center gap-1.5 mt-1" id="code-banner-badges">
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Kotlin / Gradle build
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Hilt DI Injectors
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200/50 dark:border-neutral-800/80">
                    Apache POI Excel
                  </span>
                </div>
              </div>

              {/* Source code tabs and files */}
              <div className="flex-1 min-h-[600px] flex flex-col h-full self-stretch" id="source-code-mount">
                <AndroidCodeExplorer />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Styled minimalistic footer */}
      <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-900 py-8 text-center text-xs text-neutral-500 transition-colors duration-300" id="global-footer">
        <p>© 2026 Premium Work Time Tracker Assembly. Clean Architecture Certified.</p>
        <p className="mt-2 text-sm font-semibold tracking-wide text-neutral-800 dark:text-neutral-200">
          {appSettings.language === 'he' ? 'נוצר באמצעות Omer Dahan' : 'Created by Omer Dahan'}
        </p>
      </footer>
    </div>
  );
}
