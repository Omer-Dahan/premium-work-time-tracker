/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Languages, Sun, Monitor, HardDriveUpload, ClipboardCopy, ShieldAlert, BadgeInfo, Check, AlertCircle, FileJson } from 'lucide-react';
import { AppSettings, DatabaseExport } from '../types';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onImportDatabase: (db: DatabaseExport) => void;
  onExportDatabase: () => void;
  t: (key: string) => string;
  lang: 'en' | 'he';
}

export default function SettingsScreen({
  settings,
  onUpdateSettings,
  onImportDatabase,
  onExportDatabase,
  t,
  lang,
}: SettingsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const isRTL = lang === 'he';

  const handleLanguageChange = (newLang: 'en' | 'he') => {
    onUpdateSettings({ ...settings, language: newLang });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    onUpdateSettings({ ...settings, theme: newTheme });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsed = JSON.parse(rawText) as DatabaseExport;

        // Perform schema compliance check before restoring
        if (!parsed.projects || !parsed.workSessions) {
          throw new Error('Invalid schema alignment.');
        }

        onImportDatabase(parsed);
        setSuccessMsg(t('dbImportSuccess'));
        setErrorMsg('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        setErrorMsg(t('dbImportError'));
        setSuccessMsg('');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    };

    reader.readAsText(file);
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex-1 relative h-full w-full flex flex-col overflow-hidden" id="settings-root-pane">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8 no-scrollbar flex flex-col gap-6" id="settings-screen-scroll">
      <div className="flex items-center justify-between" id="settings-header-strip">
        <h2 className="text-xl font-bold tracking-tight text-white">{t('settings')}</h2>
      </div>

      {successMsg && (
        <div className="text-xs font-semibold text-green-400 bg-green-950/20 border border-green-850/20 p-3 rounded-xl flex items-center gap-2 animate-fade-in" id="settings-success">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-850/20 p-3 rounded-xl flex items-center gap-2 animate-fade-in" id="settings-error">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Language Preferences Card */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col gap-3" id="lang-pref-card">
        <h3 className={`text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} id="lang-title">
          <Languages className="w-4 h-4 text-neutral-500" />
          <span>{t('language')}</span>
        </h3>
        <div className="grid grid-cols-2 gap-2" id="lang-buttons-grid">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`py-2.5 text-xs font-medium rounded-xl border text-center cursor-pointer transition-all ${
              settings.language === 'en'
                ? 'bg-white border-white text-black font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('he')}
            className={`py-2.5 text-xs font-medium rounded-xl border text-center cursor-pointer transition-all ${
              settings.language === 'he'
                ? 'bg-white border-white text-black font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            עברית (Hebrew)
          </button>
        </div>
      </div>

      {/* Theme preferences card */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col gap-3" id="theme-pref-card">
        <h3 className={`text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} id="theme-title">
          <Sun className="w-4 h-4 text-neutral-500" />
          <span>{t('theme')}</span>
        </h3>
        <div className="grid grid-cols-3 gap-2" id="theme-buttons-grid">
          <button
            onClick={() => handleThemeChange('light')}
            className={`py-2 text-[10px] font-bold uppercase rounded-xl border text-center cursor-pointer transition-all ${
              settings.theme === 'light'
                ? 'bg-white border-white text-black font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {t('light').split(' ')[0]}
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`py-2 text-[10px] font-bold uppercase rounded-xl border text-center cursor-pointer transition-all ${
              settings.theme === 'dark'
                ? 'bg-white border-white text-black font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {t('dark').split(' ')[0]}
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`py-2 text-[10px] font-bold uppercase rounded-xl border text-center cursor-pointer transition-all ${
              settings.theme === 'system'
                ? 'bg-white border-white text-black font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {t('systemDefault').split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Appearance card */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col gap-3" id="appearance-pref-card">
        <h3 className={`text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} id="appearance-title">
          <Monitor className="w-4 h-4 text-neutral-500" />
          <span>{t('appearance')}</span>
        </h3>
        <button
          className="w-full py-2.5 text-xs text-center text-black bg-white rounded-xl border border-white cursor-default select-none font-semibold"
          id="active-appearance-palette"
        >
          {t('blackWhitePremium')}
        </button>
        <span className="text-[10px] text-neutral-500 leading-relaxed text-center">
          Future support for additional color presets and Material You palettes.
        </span>
      </div>

      {/* Data command module */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col gap-4" id="data-management-card">
        <h3 className={`text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} id="data-title">
          <HardDriveUpload className="w-4 h-4 text-neutral-500" />
          <span>{t('dataManagement')}</span>
        </h3>

        {/* Export action */}
        <div className="flex flex-col gap-2" id="export-actions-slot">
          <button
            onClick={onExportDatabase}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl border border-neutral-800 cursor-pointer transition-all"
            id="export-db-json-btn"
          >
            <FileJson className="w-4 h-4 text-neutral-400" />
            <span>{t('exportDbText')}</span>
          </button>
          <span className="text-[10px] text-neutral-500 text-center leading-normal">
            Downloads a `.json` backup file containing your local time records.
          </span>
        </div>

        {/* Import action */}
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-900" id="import-actions-slot">
          <button
            onClick={triggerFileInput}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl border border-neutral-800 cursor-pointer transition-all"
            id="import-db-json-btn"
          >
            <ClipboardCopy className="w-4 h-4 text-neutral-400" />
            <span>{t('importDbText')}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
            id="hidden-backup-uploader"
          />
          <span className="text-[10px] text-neutral-500 text-center leading-normal">
            Upload a previously exported JSON backup file to restore database status.
          </span>
        </div>
      </div>

      {/* Privacy information card */}
      <div 
        onClick={() => setShowPolicyModal(true)}
        className="bg-neutral-950 border border-neutral-900 hover:bg-neutral-900/60 rounded-2xl p-4 flex flex-col items-center text-center gap-2 relative overflow-hidden cursor-pointer transition-all duration-300 group shrink-0" 
        id="privacy-card"
      >
        <div className="flex items-center justify-center gap-2 text-white mb-1" id="privacy-header">
          <ShieldAlert className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold uppercase tracking-wider">{t('privacyPolicy')}</h4>
        </div>
        <p className="text-[10px] text-neutral-400 leading-relaxed max-w-xs">
          {t('privacyPolicyDesc')}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPolicyModal(true);
          }}
          className="mt-1 text-[10px] text-neutral-400 group-hover:text-white font-bold underline transition-all cursor-pointer active:scale-95 self-center"
          id="trigger-privacy-modal-btn"
        >
          {isRTL ? `← ${t('viewPolicyBtn')}` : `${t('viewPolicyBtn')} →`}
        </button>
      </div>

      {/* Comprehensive Legal Privacy Policy and Liability Waiver Modal */}
      {showPolicyModal && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-50 animate-fade-in" id="privacy-policy-overlay">
          <div
            className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            id="privacy-policy-modal"
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b border-neutral-900 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`} id="policy-form-header">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <ShieldAlert className="w-4 h-4 text-white" />
                <h3 className="text-xs font-bold text-white tracking-wide">
                  {lang === 'he' ? 'מדיניות פרטיות ופטור מאחריות' : 'Privacy & Liability Waiver'}
                </h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-xs text-neutral-500 hover:text-white px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>

            {/* Scrollable Document Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-neutral-300 text-xs leading-relaxed font-sans" id="policy-modal-scroll">
              {lang === 'he' ? (
                <div className="flex flex-col gap-4 text-right" dir="rtl">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">1. עיבוד ואיסוף נתונים מקומי מלא</h4>
                    <p className="text-[11px] text-neutral-400">
                      אפליקציה זו מבוססת במלואה על מכשיר הקצה של המשתמש. שמות פרויקטים, פרטי לקוחות, שעות חיוב, תעריפים וזמני עבודה נשמרים אך ורק בבסיס הנתונים המקומי שלך (LocalStorage) במכשיר זה. אף נתון אישי או מקצועי אינו נאסף, מועבר, מעובד, או משותף עם שרתי אינטרנט או צדדים שלישיים כלשהם. למפתח אין לגשת לשום מידע שלך באופן טכנולוגי.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">2. אי-נשיאה באחריות ופטור מוחלט מפיצויים</h4>
                    <p className="text-[11px] text-neutral-400">
                      השירות ודוחות החיוב מיוצרים במצבם הנוכחי "כפי שהוא" (AS IS) ללא התחייבות, הצהרה או אחריות מכל סוג שהוא. מפתח האפליקציה אינו אחראי ולא יישא באחריות משפטית, אזרחית או פלילית לכל נזק, ישיר או עקיף, לרבות אובדן נתונים, שגיאות במדידה או חישוב כספי, או הפרשי דיווח מול לקוחותיך. באחריות המשתמש הבלעדית לבצע בקרה ואימות של נכונות הדוחות והשעות טרם שליחתם ללקוחות.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">3. שליטה מוחלטת בבסיס הנתונים</h4>
                    <p className="text-[11px] text-neutral-400">
                      המשתמש תמיד רשאי למחוק את כל נתוניו או ליצור קובץ גיבוי מורד בלחיצת כפתור פשוטה בתפריט ניהזן הנתונים. מחיקת נתוני הדפדפן (כגון מחיקת קובצי Cookie, זיכרון מטמון או היסטוריה במכשיר) עלולה למחוק את שעות העבודה השמורות, ולכן מומלץ ליצור גיבויים תקופתיים בפורמט JSON השמור אצלך במחשב.
                    </p>
                  </div>

                  <div className="border-t border-neutral-900 pt-3 text-[10px] text-neutral-500 font-mono">
                    מדיניות הצהרה זו נועדה להגן על המפתח באופן מלא ומוחלט מפני דרישות, תביעות או טענות נזק מכל סוג שהוא.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 text-left">
                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">1. 100% Local Processing & Anti-Tracking</h4>
                    <p className="text-[11px] text-neutral-400">
                      All created projects, clients, tracked work durations, hourly rates, and pause cycles are processed and stored exclusively in your device\'s local storage cache. We do not run any backends, analytical metrics, remote trackers, or telemetry lines. The developer has no capability to view or access your corporate or personal records.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">2. Absolute Disclaimer of Liability</h4>
                    <p className="text-[11px] text-neutral-400">
                      This application is provided \'as is\' without warranty of any kind. Under no circumstances shall the developer or service providers be liable for data loss, tracking flaws, calculation errors, client billing discrepancies, or financial damages. You are entirely responsible for cross-checking log statistics before dispatching invoices to clients.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs mb-1">3. Complete User DB Domination</h4>
                    <p className="text-[11px] text-neutral-400">
                      You maintain full charge of your local data. You can clear or backup your records anytime using our JSON export workflows. Please backup your data often as clearing browser cache may irreversibly clear local storage database states.
                    </p>
                  </div>

                  <div className="border-t border-neutral-900 pt-3 text-[10px] text-neutral-500 font-mono">
                    This document provides legally protective coverage to defend the developer unconditionally against any liabilities.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-900 bg-neutral-950 flex shrink-0" id="policy-footer">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all"
                id="close-policy-modal-btn"
              >
                {t('closePolicyBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Box */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col gap-2" id="about-card">
        <div className={`flex items-center gap-2 text-white mb-1 ${isRTL ? 'flex-row-reverse' : ''}`} id="about-header">
          <BadgeInfo className="w-4 h-4 text-neutral-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider">{t('about')}</h4>
        </div>
        <div className={`flex items-center justify-between text-[11px] font-mono text-neutral-400 ${isRTL ? 'flex-row-reverse' : ''}`} id="about-version-slot">
          <span>{t('appVersion')}</span>
          <span>v1.0.0 (Preview Demo)</span>
        </div>
        <div className={`flex items-center justify-between text-[11px] font-mono text-neutral-400 ${isRTL ? 'flex-row-reverse' : ''}`} id="about-db-slot">
          <span>Local Engine</span>
          <span>SQLite / LocalStorage</span>
        </div>
        <div className={`flex items-center justify-between text-[11px] font-mono text-neutral-400 ${isRTL ? 'flex-row-reverse' : ''}`} id="about-developer-slot">
          <span>{isRTL ? 'נוצר באמצעות' : 'Created by'}</span>
          <span className="font-semibold text-neutral-300">Omer Dahan</span>
        </div>
      </div>
    </div>
    </div>
  );
}
