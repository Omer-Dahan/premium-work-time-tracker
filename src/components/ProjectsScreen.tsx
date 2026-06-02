/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Pause, Square, Plus, Edit2, Trash2, Clock, DollarSign, Briefcase, Info, Check } from 'lucide-react';
import { Project, WorkSession } from '../types';

interface ProjectsScreenProps {
  projects: Project[];
  sessions: WorkSession[];
  activeSession: {
    projectId: string;
    isPaused: boolean;
    currentWorkedSeconds: number;
    currentSessionId: string;
  } | null;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onStartWorking: (projectId: string) => void;
  onPauseWorking: () => void;
  onResumeWorking: () => void;
  onStopWorking: () => void;
  t: (key: string) => string;
  lang: 'en' | 'he';
}

export default function ProjectsScreen({
  projects,
  sessions,
  activeSession,
  onSaveProject,
  onDeleteProject,
  onStartWorking,
  onPauseWorking,
  onResumeWorking,
  onStopWorking,
  t,
  lang,
}: ProjectsScreenProps) {
  // Modal controllers
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHourlyRate, setFormHourlyRate] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formImagePath, setFormImagePath] = useState('');

  // Form errors
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormDescription('');
    setFormHourlyRate('');
    setFormClientName('');
    setFormImagePath('');
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setFormName(proj.name);
    setFormDescription(proj.description);
    setFormHourlyRate(proj.hourlyRate ? proj.hourlyRate.toString() : '');
    setFormClientName(proj.clientName || '');
    setFormImagePath(proj.imagePath || '');
    setFormError('');
    setShowFormModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('projectNameReq'));
      return;
    }

    const hourlyRateVal = formHourlyRate.trim() ? parseFloat(formHourlyRate) : null;
    if (hourlyRateVal !== null && isNaN(hourlyRateVal)) {
      setFormError('Please enter a valid rate number.');
      return;
    }

    const updatedProject: Project = {
      id: editingProject?.id || `proj_${Date.now()}`,
      name: formName.trim(),
      description: formDescription.trim(),
      hourlyRate: hourlyRateVal,
      clientName: formClientName.trim(),
      imagePath: formImagePath || 'assets/projects/placeholder.png', // stored for future support
      createdAt: editingProject?.createdAt || Date.now(),
    };

    onSaveProject(updatedProject);
    setShowFormModal(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      onDeleteProject(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  // Format accumulated seconds into HH:MM:SS
  const formatSeconds = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Calculate static past hours worked for a project
  const calculatePastSeconds = (projectId: string) => {
    return sessions
      .filter((s) => s.projectId === projectId && s.endTime !== null)
      .reduce((acc, curr) => acc + curr.totalWorkedSeconds, 0);
  };

  const isRTL = lang === 'he';

  return (
    <div className="flex-1 relative h-full w-full flex flex-col overflow-hidden" id="projects-root-pane">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32 flex flex-col gap-6" id="projects-screen-scroll">
        {/* Search / Stat Strip */}
        <div className="flex items-center justify-between" id="projects-header-strip">
          <h2 className="text-xl font-bold tracking-tight text-white">{t('projects')}</h2>
          <span className="text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-full">
            {projects.length} {projects.length === 1 ? t('project').toLowerCase() : t('projects').toLowerCase()}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-neutral-950 border border-dashed border-neutral-800 rounded-2xl" id="projects-empty-state">
            <Briefcase className="w-10 h-10 text-neutral-600 mb-3" />
            <p className="text-sm font-medium text-neutral-300 leading-normal max-w-[240px]">
              {t('emptyState_projects')}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-white text-black hover:bg-neutral-200 transition-all font-medium text-xs rounded-xl cursor-pointer"
              id="create-first-project-btn"
            >
              {t('createProject')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4" id="projects-list">
            {projects.map((proj) => {
              const isCurrentActive = activeSession?.projectId === proj.id;
              const pastSec = calculatePastSeconds(proj.id);
              const liveSec = isCurrentActive ? activeSession.currentWorkedSeconds : 0;
              const displaySec = pastSec + liveSec;

              let statusText = t('notRunning');
              let statusColor = 'bg-neutral-800 text-neutral-400';
              let cardBorder = 'border-neutral-800';

              if (isCurrentActive) {
                if (activeSession.isPaused) {
                  statusText = t('paused');
                  statusColor = 'bg-amber-950/20 text-amber-400 border border-amber-800/30';
                  cardBorder = 'border-amber-800/20';
                } else {
                  statusText = t('active');
                  statusColor = 'bg-white text-black font-semibold animate-pulse';
                  cardBorder = 'border-white';
                }
              }

              return (
                <div
                  key={proj.id}
                  className={`relative flex flex-col bg-neutral-950/80 border ${cardBorder} rounded-2xl p-5 hover:bg-neutral-950 hover:transition-all group shrink-0`}
                  id={`project-card-${proj.id}`}
                >
                  {/* Upper row: Name & Status indicator */}
                  <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`} id="proj-card-upper">
                    <div className="flex-1" id="proj-card-title-container">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1 block">
                        {proj.clientName ? `${t('clientLabel')}: ${proj.clientName}` : t('project')}
                      </span>
                      <h3 className="text-base font-bold text-white transition-colors group-hover:text-neutral-200">
                        {proj.name}
                      </h3>
                    </div>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md tracking-wider shrink-0 select-none ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Description */}
                  {proj.description && (
                    <p className={`text-xs text-neutral-400 mt-2 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {proj.description}
                    </p>
                  )}

                  {/* Rate details */}
                  {proj.hourlyRate && (
                    <div className={`flex items-center gap-1.5 mt-3 text-neutral-400 text-xs font-mono justify-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{t('rateLabel')}: ${proj.hourlyRate}/{t('hoursShort')}</span>
                    </div>
                  )}

                  {/* Total time worked tracker UI */}
                  <div className="mt-5 pt-4 border-t border-neutral-900/60 flex items-center justify-between" id="proj-card-timer-strip">
                    <div className={`flex flex-col ${isRTL ? 'items-end text-right' : 'items-start text-left'}`}>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                        {t('totalTimeWorked')}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span className="text-lg font-bold font-mono text-white tracking-tight">
                          {formatSeconds(displaySec)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Drawer */}
                    <div className="flex items-center gap-2" id="action-drawer-container">
                      <button
                        onClick={(e) => openEditModal(proj, e)}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900/80 rounded-xl transition-all cursor-pointer"
                        title={t('editProject')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(proj.id, e)}
                        className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                        title={t('deleteProject')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* GIANT ACTION TIMER BUTTON: Start Working / Pause / Stop */}
                  <div className="mt-4" id="giant-working-button-wrapper">
                    {!isCurrentActive ? (
                      <button
                        onClick={() => onStartWorking(proj.id)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-neutral-100 text-black font-bold text-sm tracking-wide rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
                        id={`start-work-btn-${proj.id}`}
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>{t('startWorking')}</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2" id="timer-active-button-slots">
                        {activeSession.isPaused ? (
                          <button
                            onClick={onResumeWorking}
                            className="flex items-center justify-center gap-1.5 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                            id={`resume-work-btn-${proj.id}`}
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{t('resume')}</span>
                          </button>
                        ) : (
                          <button
                            onClick={onPauseWorking}
                            className="flex items-center justify-center gap-1.5 py-3 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/20 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                            id={`pause-work-btn-${proj.id}`}
                          >
                            <Pause className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{t('pause')}</span>
                          </button>
                        )}

                        <button
                          onClick={onStopWorking}
                          className="flex items-center justify-center gap-1.5 py-3 bg-red-950 hover:bg-red-900 text-red-200 border border-red-500/20 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                          id={`stop-work-btn-${proj.id}`}
                        >
                          <Square className="w-3.5 h-3.5 fill-red-200" />
                          <span>{t('stop')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Action Button (FAB) Bottom Right */}
      <button
        onClick={openCreateModal}
        className={`absolute bottom-6 right-6 w-12 h-12 bg-white text-black hover:bg-neutral-200 shadow-xl rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-40 ${isRTL ? 'right-auto left-6' : ''
          }`}
        id="project-fab-btn"
      >
        <Plus className="w-6 h-6 stroke-[3px]" />
      </button>

      {/* Slide-Up Overlay Drawer / Modal for Project form */}
      {showFormModal && (
        <div className="absolute inset-0 bg-black/80 flex items-end justify-center z-50 animate-fade-in p-4" id="project-form-overlay">
          <div
            className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl p-6"
            id="project-form-modal"
          >
            <div className="flex items-center justify-between mb-4 border-b border-neutral-900 pb-3" id="form-header">
              <h3 className="text-sm font-bold text-white">
                {editingProject ? t('editProject') : t('createProject')}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-xs text-neutral-500 hover:text-white px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="project-form">
              {formError && (
                <div className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-800/30 p-2.5 rounded-xl">
                  {formError}
                </div>
              )}

              {/* Title Input */}
              <div className="flex flex-col gap-1.5" id="form-field-title">
                <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                  {t('projectNameRef')}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Android Redevelopment"
                  className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                  required
                />
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1.5" id="form-field-desc">
                <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                  {t('descriptionOpt')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of scope..."
                  className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 h-16 resize-none"
                />
              </div>

              {/* Client & Rate row */}
              <div className="grid grid-cols-2 gap-3" id="form-row-client-rate">
                <div className="flex flex-col gap-1.5" id="form-field-client">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                    {t('clientNameOpt')}
                  </label>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="XYZ Org"
                    className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5" id="form-field-rate">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                    {t('hourlyRateOpt')} ($)
                  </label>
                  <input
                    type="number"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(e.target.value)}
                    placeholder="150"
                    className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Project Image Metadata Store */}
              <div className="flex flex-col gap-1.5" id="form-field-image">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                    Future Support: Project Image Path
                  </label>
                  <span className="text-[9px] bg-neutral-900 text-neutral-500 px-1.5 py-0.2 rounded font-mono">DB Stored</span>
                </div>
                <input
                  type="text"
                  value={formImagePath}
                  onChange={(e) => setFormImagePath(e.target.value)}
                  placeholder="assets/logo.png"
                  className="w-full text-[10px] bg-neutral-900/50 border border-neutral-850 rounded-xl px-3 py-1.5 text-neutral-500 placeholder-neutral-700 cursor-not-allowed focus:outline-none"
                  disabled
                />
              </div>

              {/* Save trigger */}
              <button
                type="submit"
                className="w-full flex items-center justify-center py-2.5 bg-white text-black font-bold text-xs rounded-xl shadow cursor-pointer hover:bg-neutral-200 transition-all active:scale-[0.98] mt-2"
                id="save-project-form-btn"
              >
                <Check className="w-4 h-4 mr-1.5" />
                <span>{t('save')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-50 animate-fade-in" id="delete-dialog-overlay">
          <div className="bg-neutral-950 border border-neutral-800 max-w-sm rounded-2xl p-6 text-center shadow-2xl" id="delete-dialog">
            <Info className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white mb-2">{t('deleteProject')}?</h4>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              {t('confirmDelete')}
            </p>
            <div className="flex items-center gap-3" id="delete-dialog-actions">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer border border-neutral-800 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-950 hover:bg-red-900 text-red-200 text-xs font-semibold rounded-xl cursor-pointer border border-red-500/20 transition-all"
                id="confirm-delete-project-btn"
              >
                {t('stop')} (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
