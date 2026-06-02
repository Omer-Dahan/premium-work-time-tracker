/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileSpreadsheet, Settings, Wifi, Battery, Signal, ArrowRight, ArrowLeft } from 'lucide-react';

interface PhoneSimulatorProps {
  children: React.ReactNode;
  activeTab: 'projects' | 'reports' | 'settings';
  setActiveTab: (tab: 'projects' | 'reports' | 'settings') => void;
  lang: 'en' | 'he';
  t: (key: string) => string;
}

export default function PhoneSimulator({
  children,
  activeTab,
  setActiveTab,
  lang,
  t,
}: PhoneSimulatorProps) {
  // Local real-time ticker for the simulated Android StatusBar
  const [statusBarTime, setStatusBarTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setStatusBarTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const isRTL = lang === 'he';

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 self-stretch" id="phone-simulator-shell">
      {/* Phone chassis */}
      <div
        className="relative w-full max-w-[380px] h-[780px] rounded-[50px] border-[12px] border-neutral-900 bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col select-none select-none select-none transition-all duration-300 ring-1 ring-neutral-800/50"
        id="phone-device-bezel"
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-900 rounded-full z-50 flex items-center justify-center p-0.5 gap-1.5" id="dynamic-notch">
          <div className="w-2.5 h-2.5 rounded-full bg-[#111111] border border-neutral-800/40"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]"></div>
        </div>

        {/* Android Native-Style Status Bar */}
        <div
          className={`h-11 px-6 bg-black flex items-center justify-between text-white text-[11px] font-medium tracking-tight select-none z-45 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
          id="phone-status-bar"
        >
          {/* Status Left: Ticking Digital Clock */}
          <span className="font-semibold font-sans tabular-nums text-neutral-300">{statusBarTime}</span>
          
          {/* Status Right: Wifi + Network Strength + Battery Percentage indicators */}
          <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`} id="status-bar-icons">
            <Signal className="w-3.5 h-3.5 text-neutral-300 stroke-[2.5px]" />
            <Wifi className="w-3.5 h-3.5 text-neutral-300 stroke-[2.5px]" />
            <div className="flex items-center gap-1 bg-neutral-900 px-1 py-0.5 rounded-md border border-neutral-800/40" id="battery-status">
              <span className="text-[9px] font-bold text-neutral-400 font-sans">98%</span>
              <Battery className="w-3.5 h-3.5 text-neutral-300 fill-neutral-300 stroke-[1px]" />
            </div>
          </div>
        </div>

        {/* Core Screen Scroll Container */}
        <div className="flex-1 bg-[#121212] overflow-hidden flex flex-col relative" id="phone-screen-viewport">
          {children}
        </div>

        {/* Android Navigation Bar (Bottom Tabs Selector) */}
        <div
          className={`h-[72px] bg-black border-t border-neutral-900 px-6 pb-2 pt-1 flex items-center justify-around z-45 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
          id="phone-navigation-bar"
        >
          {/* Dashboard Tab button */}
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'projects' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            id="tab-projects-btn"
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'projects' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            <span className="text-[9px] font-bold tracking-wider uppercase">{t('dashboard')}</span>
          </button>

          {/* Reports Tab button */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reports' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            id="tab-reports-btn"
          >
            <FileSpreadsheet className={`w-5 h-5 ${activeTab === 'reports' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            <span className="text-[9px] font-bold tracking-wider uppercase">{t('reports')}</span>
          </button>

          {/* Settings Tab button */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            id="tab-settings-btn"
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            <span className="text-[9px] font-bold tracking-wider uppercase">{t('settings')}</span>
          </button>
        </div>

        {/* Screen Bottom Pill Bar (The physical swipe up line) */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-neutral-800 rounded-full z-50 pointer-events-none" id="swipe-line"></div>
      </div>
    </div>
  );
}
