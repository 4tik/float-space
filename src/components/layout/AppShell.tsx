import React, { useState } from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { StageManagerSidebar } from './StageManagerSidebar';
import { MacTrafficLights } from '../common/MacTrafficLights';
import { ipcClient } from '../../services/ipc-client';
import { useMonitorStore } from '../../stores/monitor-store';
import { DashboardView } from '../../features/dashboard/DashboardView';
import { MissionControlView } from '../../features/mission-control/MissionControlView';
import { WorkspacesView } from '../../features/workspaces/WorkspacesView';
import { ApplicationCatalogView } from '../../features/applications/ApplicationCatalogView';
import { LayoutPresetsView } from '../../features/layouts/LayoutPresetsView';
import { SettingsView } from '../../features/settings/SettingsView';
import { AboutView } from '../../features/about/AboutView';
import { MonitorListView } from '../../features/floating-monitors/MonitorListView';
import { CreateMonitorModal } from '../../features/floating-monitors/CreateMonitorModal';

export const AppShell: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stageManagerOpen, setStageManagerOpen] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [attachSource, setAttachSource] = useState<{ sourceId?: string; title?: string }>({});

  const { monitors } = useMonitorStore();

  const handleOpenAttach = (sourceId?: string, title?: string) => {
    setAttachSource({ sourceId, title });
    setCreateModalOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100/95 dark:bg-[#18181b]/95 text-slate-800 dark:text-slate-100 select-none font-sans rounded-mac-xl border border-slate-300/40 dark:border-white/10 shadow-mac-window dark:shadow-mac-window-dark">
      {/* Top macOS Frameless Window Titlebar */}
      <header className="h-10 w-full flex items-center justify-between px-3 border-b border-slate-200/50 dark:border-white/5 select-none app-drag-region z-30 shrink-0">
        <div className="flex items-center gap-3">
          <MacTrafficLights
            onClose={() => ipcClient.closeMain()}
            onMinimize={() => ipcClient.minimizeMain()}
            onMaximize={() => ipcClient.maximizeMain()}
          />
        </div>

        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight flex items-center gap-2 pointer-events-none">
          <span>Float-Space</span>
        </div>

        <div className="w-16" />
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeMonitorCount={monitors.length}
        />

        {/* Dynamic View Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenCreateModal={() => {
                setAttachSource({});
                setCreateModalOpen(true);
              }}
              onNavigateTab={setCurrentTab}
            />
          )}
          {currentTab === 'mission-control' && <MissionControlView />}
          {currentTab === 'workspaces' && <WorkspacesView />}
          {currentTab === 'floating-monitors' && (
            <MonitorListView
              onOpenCreateModal={() => {
                setAttachSource({});
                setCreateModalOpen(true);
              }}
            />
          )}
          {currentTab === 'applications' && (
            <ApplicationCatalogView onAttachMonitor={handleOpenAttach} />
          )}
          {currentTab === 'layouts' && <LayoutPresetsView />}
          {currentTab === 'settings' && <SettingsView />}
          {currentTab === 'about' && <AboutView />}
        </main>

        {/* Stage Manager Sidebar */}
        <StageManagerSidebar
          isOpen={stageManagerOpen}
          onToggle={() => setStageManagerOpen(!stageManagerOpen)}
        />
      </div>

      {/* Create Monitor Modal */}
      <CreateMonitorModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        initialSourceId={attachSource.sourceId}
        initialTitle={attachSource.title}
      />
    </div>
  );
};
