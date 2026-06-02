/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Filter, FileSpreadsheet, Hourglass, TrendingUp, DollarSign, ListCollapse, Check, Coins, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Project, WorkSession, AppSettings } from '../types';

interface ReportsScreenProps {
  projects: Project[];
  sessions: WorkSession[];
  settings: AppSettings;
  t: (key: string) => string;
  lang: 'en' | 'he';
}

type FilterType = 'all' | 'day' | 'week' | 'month' | 'custom';

export default function ReportsScreen({ projects, sessions, settings, t, lang }: ReportsScreenProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [notification, setNotification] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'ILS'>(() => {
    return (settings?.currency === 'ILS' || lang === 'he') ? 'ILS' : 'USD';
  });
  const [customHourlyRate, setCustomHourlyRate] = useState<string>('');
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);

  const isRTL = lang === 'he';

  // Compute filtered sessions based on criteria
  const filteredSessions = useMemo(() => {
    const startOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let minTime = 0;
    let maxTime = Infinity;

    if (filterType === 'day') {
      minTime = startOfDay(new Date());
      maxTime = minTime + dayMs;
    } else if (filterType === 'week') {
      const d = new Date();
      const currentDay = d.getDay(); // 0 is Sunday
      // Align to starting Sunday
      const diff = d.getDate() - currentDay;
      const sunday = new Date(d.setDate(diff));
      minTime = startOfDay(sunday);
    } else if (filterType === 'month') {
      const d = new Date();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      minTime = firstDay.getTime();
    } else if (filterType === 'custom') {
      if (startDateStr) {
        minTime = startOfDay(new Date(startDateStr));
      }
      if (endDateStr) {
        maxTime = startOfDay(new Date(endDateStr)) + dayMs;
      }
    }

    return sessions.filter((sess) => {
      // End date check, exclude incomplete runs unless they are active
      const sessionTime = sess.startTime;
      const isWithinDateRange = sessionTime >= minTime && sessionTime < maxTime;

      const matchesProj = selectedProjectId === 'all' || sess.projectId === selectedProjectId;

      return isWithinDateRange && matchesProj && sess.endTime !== null;
    });
  }, [sessions, filterType, selectedProjectId, startDateStr, endDateStr]);

  // Compute display statistics
  const stats = useMemo(() => {
    const count = filteredSessions.length;
    const totalSeconds = filteredSessions.reduce((acc, curr) => acc + curr.totalWorkedSeconds, 0);
    const totalHours = totalSeconds / 3600;

    const parsedCustomRate = parseFloat(customHourlyRate);
    const useOverride = !isNaN(parsedCustomRate) && parsedCustomRate >= 0;

    // Estimate Revenue if hourlyRate exists, or use custom override rate
    const revenue = filteredSessions.reduce((acc, sess) => {
      const proj = projects.find((p) => p.id === sess.projectId);
      const rate = useOverride ? parsedCustomRate : (proj?.hourlyRate || 0);
      const hours = sess.totalWorkedSeconds / 3600;
      return acc + (hours * rate);
    }, 0);

    // Group sessions by day to find active days for daily working average hours
    const daysMap = new Map<string, number>();
    filteredSessions.forEach((sess) => {
      const dayKey = new Date(sess.startTime).toDateString();
      daysMap.set(dayKey, (daysMap.get(dayKey) || 0) + sess.totalWorkedSeconds);
    });

    const activeDaysCount = daysMap.size || 1;
    const dailyAvgSeconds = totalSeconds / activeDaysCount;
    const dailyAvgHours = dailyAvgSeconds / 3600;

    return {
      totalHours,
      sessionsCount: count,
      dailyAvgHours,
      revenue,
    };
  }, [filteredSessions, projects, customHourlyRate]);

  // Handle SheetJS XLSX compiling
  const handleExportXlsx = () => {
    try {
      const wb = XLSX.utils.book_new();

      const currencySymbol = selectedCurrency === 'ILS' ? '₪' : '$';
      const parsedCustomRate = parseFloat(customHourlyRate);
      const useOverride = !isNaN(parsedCustomRate) && parsedCustomRate >= 0;

      // Formatting Sheet 1: Detailed Sessions
      const detailRows = filteredSessions.map((sess) => {
        const proj = projects.find((p) => p.id === sess.projectId);
        const start = new Date(sess.startTime);
        const end = sess.endTime ? new Date(sess.endTime) : new Date();
        const rate = useOverride ? parsedCustomRate : (proj?.hourlyRate || 0);

        return {
          [isRTL ? 'תאריך' : 'Date']: start.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US'),
          [isRTL ? 'שעת התחלה' : 'Start Time']: start.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US'),
          [isRTL ? 'שעת סיום' : 'End Time']: end.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US'),
          [isRTL ? 'משך שנמדד (בשעות)' : 'Worked Hours']: parseFloat((sess.totalWorkedSeconds / 3600).toFixed(2)),
          [isRTL ? 'שם הפרויקט' : 'Project Name']: proj?.name || 'Project Deleted',
          [isRTL ? 'שם הלקוח' : 'ClientName']: proj?.clientName || '-',
          [isRTL ? `שיעור לשעה (${currencySymbol})` : `Hourly Rate (${currencySymbol})`]: rate,
          [isRTL ? 'מפתח מפגש' : 'Session UID']: sess.id,
        };
      });

      const ws1 = XLSX.utils.json_to_sheet(detailRows);

      // Formatting Sheet 2: Summary Page
      const summaryRows = projects.map((proj) => {
        const projSessions = filteredSessions.filter((s) => s.projectId === proj.id);
        const totalSec = projSessions.reduce((acc, curr) => acc + curr.totalWorkedSeconds, 0);
        const totalHours = totalSec / 3600;
        const rate = useOverride ? parsedCustomRate : (proj.hourlyRate || 0);
        const estRevenue = totalHours * rate;

        return {
          [isRTL ? 'שם הפרויקט' : 'Project']: proj.name,
          [isRTL ? 'לקוח' : 'Client']: proj.clientName || '-',
          [isRTL ? 'סך הכל שעות' : 'Total Hours']: parseFloat(totalHours.toFixed(2)),
          [isRTL ? 'תעריף שעתי' : 'Hourly Rate']: rate,
          [isRTL ? `הכנסה משוערת (${currencySymbol})` : `Estimated Revenue (${currencySymbol})`]: parseFloat(estRevenue.toFixed(2)),
        };
      });

      // Append Overall Total to bottom of Summary Row - using type-checks to avoid TS errors
      const totalHoursAll = summaryRows.reduce((acc, row) => {
        const key = isRTL ? 'סך הכל שעות' : 'Total Hours';
        const val = row[key];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);

      const totalRevAll = summaryRows.reduce((acc, row) => {
        const key = isRTL ? `הכנסה משוערת (${currencySymbol})` : `Estimated Revenue (${currencySymbol})`;
        const val = row[key];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);

      summaryRows.push({
        [isRTL ? 'שם הפרויקט' : 'Project']: isRTL ? 'סך הכל כללי' : 'TOTAL OVERALL',
        [isRTL ? 'לקוח' : 'Client']: '',
        [isRTL ? 'סך הכל שעות' : 'Total Hours']: parseFloat(totalHoursAll.toFixed(2)),
        [isRTL ? 'תעריף שעתי' : 'Hourly Rate']: 0,
        [isRTL ? `הכנסה משוערת (${currencySymbol})` : `Estimated Revenue (${currencySymbol})`]: parseFloat(totalRevAll.toFixed(2)),
      });

      const ws2 = XLSX.utils.json_to_sheet(summaryRows);

      XLSX.utils.book_append_sheet(wb, ws1, isRTL ? 'מפגשים מפורטים' : 'Detailed Sessions');
      XLSX.utils.book_append_sheet(wb, ws2, isRTL ? 'סיכום פרויקטים' : 'Summary');

      // Write Workbook to standard client download path
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `work_report_${dateStr}.xlsx`);

      setNotification(t('exportSuccess'));
      setTimeout(() => setNotification(''), 4000);
    } catch (e) {
      console.error(e);
      setNotification('Export error occurred.');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const formatSecToHours = (totalSec: number) => {
    return (totalSec / 3600).toFixed(2);
  };

  const currencySymbol = selectedCurrency === 'ILS' ? '₪' : '$';

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8 no-scrollbar flex flex-col gap-6" id="reports-screen">
      <div className="flex items-center justify-between" id="reports-header-strip">
        <h2 className="text-xl font-bold tracking-tight text-white">{t('reportsAndExport')}</h2>
      </div>

      {notification && (
        <div className="text-xs font-semibold text-green-400 bg-green-950/20 border border-green-800/20 p-3 rounded-xl flex items-center gap-2" id="report-notif">
          <Check className="w-4 h-4 text-green-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4" id="reports-filter-panel">
        {/* Project Selector Filter */}
        <div className="flex flex-col gap-1.5" id="proj-selector-filter">
          <label className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Filter className="w-3 h-3 text-neutral-500" />
            <span>{t('filterBy')} {t('project')}</span>
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            id="reports-project-select"
          >
            <option value="all">{t('allData')}</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Ranges selectors */}
        <div className="flex flex-col gap-1.5" id="date-range-filter">
          <label className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span>{t('filterBy')} {t('date')}</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5" id="date-presets-grid">
            {(['all', 'day', 'week', 'month'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setFilterType(preset)}
                className={`py-2 text-[10px] font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                  filterType === preset
                    ? 'bg-white border-white text-black'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                id={`preset-${preset}`}
              >
                {preset === 'all'
                  ? t('allData')
                  : preset === 'day'
                  ? t('singleDay')
                  : preset === 'week'
                  ? t('week')
                  : t('month')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFilterType('custom')}
            className={`w-full mt-1.5 py-2 text-[10px] font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
              filterType === 'custom'
                ? 'bg-white border-white text-black'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            id="preset-custom"
          >
            {t('customRange')}
          </button>
        </div>

        {/* Input variables if Custom Active */}
        {filterType === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-900" id="custom-inputs-row">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">{t('startDate')}</span>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full text-xs text-center text-white bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">{t('endDate')}</span>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full text-xs text-center text-white bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Currency & Hourly Rate Selector Controls */}
        <div className="border-t border-neutral-900 pt-3 flex flex-col gap-3" id="reports-currency-wage-override">
          <div className="grid grid-cols-2 gap-3">
            {/* Currency Selector */}
            <div className="flex flex-col gap-1.5" id="currency-toggle-wrapper">
              <label className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Coins className="w-3 h-3 text-neutral-500" />
                <span>{t('currencyLabel')}</span>
              </label>
              <div className="grid grid-cols-2 gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded-xl h-9" id="currency-segmented-controls">
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('USD')}
                  className={`text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedCurrency === 'USD'
                      ? 'bg-white text-black font-extrabold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('ILS')}
                  className={`text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedCurrency === 'ILS'
                      ? 'bg-white text-black font-extrabold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ILS (₪)
                </button>
              </div>
            </div>

            {/* Custom Hourly Rate Override Input */}
            <div className="flex flex-col gap-1.5" id="rate-override-input-wrapper">
              <label className={`text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calculator className="w-3 h-3 text-neutral-500" />
                <span>{t('overrideRateLabel')}</span>
              </label>
              <div className="relative flex items-center h-9" id="override-inner-box">
                <span className={`absolute ${isRTL ? 'right-3' : 'left-3'} text-xs font-bold text-neutral-500 select-none`}>
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={customHourlyRate}
                  onChange={(e) => setCustomHourlyRate(e.target.value)}
                  placeholder={isRTL ? 'שכר שעתי חלופי' : 'Override rate...'}
                  className={`w-full h-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl ${isRTL ? 'pr-7 pl-3 text-right' : 'pl-7 pr-3 text-left'} text-white focus:outline-none focus:border-neutral-500 font-mono`}
                />
              </div>
            </div>
          </div>
          <span className={`text-[9px] text-neutral-500 leading-normal -mt-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('overrideRateDesc')}
          </span>
        </div>
      </div>

      {/* Numerical Bento Grid showing compiled metrics stats */}
      <div className="grid grid-cols-2 gap-4" id="stats-grid">
        {/* Total hours */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-900/60 text-left relative overflow-hidden flex flex-col justify-between" id="stat-total-hours">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('totalHours')}</span>
            <Hourglass className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono tracking-tight text-white">
              {stats.totalHours.toFixed(1)}
            </h4>
            <p className="text-[9px] text-neutral-500 mt-1">Accumulated worked hours</p>
          </div>
        </div>

        {/* Total income est */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-900/60 text-left relative overflow-hidden flex flex-col justify-between" id="stat-revenue">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('estimatedIncome')}</span>
            <Coins className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono tracking-tight text-white">
              {currencySymbol}{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </h4>
            <p className="text-[9px] text-neutral-500 mt-1">Total revenue multiplier</p>
          </div>
        </div>

        {/* Active sessions */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-900/60 text-left relative overflow-hidden flex flex-col justify-between" id="stat-sessions-count">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('sessionsCount')}</span>
            <ListCollapse className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono tracking-tight text-white">
              {stats.sessionsCount}
            </h4>
            <p className="text-[9px] text-neutral-500 mt-1">Sessions recorded in range</p>
          </div>
        </div>

        {/* Daily average */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-900/60 text-left relative overflow-hidden flex flex-col justify-between" id="stat-daily-avg">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider">{t('avgDailyHours')}</span>
            <TrendingUp className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono tracking-tight text-white">
              {stats.dailyAvgHours.toFixed(1)}
            </h4>
            <p className="text-[9px] text-neutral-500 mt-1">Daily hours baseline</p>
          </div>
        </div>
      </div>

      {/* XLSX EXPORT TRIGGER */}
      <button
        onClick={handleExportXlsx}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black font-bold text-sm tracking-wide rounded-2xl shadow-md cursor-pointer hover:bg-neutral-200 transition-all active:scale-[0.98]"
        id="trigger-xlsx-export-btn"
      >
        <FileSpreadsheet className="w-4 h-4 fill-black/10" />
        <span>{t('exportToExcel')}</span>
      </button>

      {/* Table grid displaying matching sessions */}
      <div className="bg-neutral-950 border border-neutral-900/60 rounded-2xl p-4 overflow-hidden flex flex-col items-center text-center shrink-0" id="reports-table-container">
        <button
          onClick={() => setIsTableCollapsed(!isTableCollapsed)}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-neutral-500 uppercase mb-0.5 cursor-pointer hover:text-white transition-colors select-none focus:outline-none"
          id="toggle-table-btn"
        >
          <ListCollapse className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-300 ${isTableCollapsed ? 'rotate-180' : ''}`} />
          <span>{t('detailedSessions')}</span>
        </button>
        <p className="text-[10px] text-neutral-500 mb-3 block">
          {t('detailedTableSubtitle')}
        </p>

        {!isTableCollapsed && (
          filteredSessions.length === 0 ? (
            <p className="text-[10px] text-neutral-500 leading-normal text-center py-4 w-full">
              {t('noSessionsFound')}
            </p>
          ) : (
            <div className="overflow-x-auto w-full" id="table-scroll-slot">
              <table className={`w-full text-xs text-neutral-400 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`} id="sessions-table">
                <thead>
                  <tr className="border-b border-neutral-900 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                    <th className={`py-2.5 px-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('date')}</th>
                    <th className={`py-2.5 px-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('project')}</th>
                    <th className={`py-2.5 px-2 ${isRTL ? 'text-left' : 'text-right'}`}>{t('hoursWorked')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((sess) => {
                    const proj = projects.find((p) => p.id === sess.projectId);
                    const sessionDate = new Date(sess.startTime).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <tr key={sess.id} className="border-b border-neutral-900/55 hover:bg-neutral-900/10">
                        <td className="py-2.5 px-2 font-mono text-[11px] text-white">
                          {sessionDate}
                        </td>
                        <td className="py-2.5 px-2 font-medium truncate max-w-[120px] text-neutral-300">
                          {proj?.name || 'Project Deleted'}
                        </td>
                        <td className={`py-2.5 px-2 font-mono text-[11px] text-white ${isRTL ? 'text-left' : 'text-right'}`}>
                          {formatSecToHours(sess.totalWorkedSeconds)} {t('hoursShort')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
