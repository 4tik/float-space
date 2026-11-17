import React from 'react';
import { Monitor, Heart, ExternalLink, Github, Sparkles } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const AboutView: React.FC = () => {
  return (
    <div className="p-8 max-w-2xl mx-auto text-center space-y-6 animate-fade-in app-no-drag">
      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-xl mb-2">
        <Monitor size={44} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Float-Space
        </h1>
        <p className="text-xs text-primary-500 font-medium mt-1">
          Cross-Platform Desktop Floating Workspace & Application Manager
        </p>
      </div>

      <div className="mac-glass-surface p-5 rounded-mac-xl border border-slate-200/50 dark:border-white/10 text-left space-y-4 text-xs">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Float-Space brings together the best concepts of macOS Mission Control, Stage Manager,
          Spaces, Picture-in-Picture, and native desktop window management into one unified native desktop
          application.
        </p>

        <div className="border-t border-slate-200/40 dark:border-white/5 pt-3">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Technology Stack</h4>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Electron 33',
              'React 18',
              'TypeScript',
              'Tailwind CSS',
              'SQLite (sql.js)',
              'Zustand 5',
              'Lucide Icons',
              'Vite 6',
              'Vitest',
            ].map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200/40 dark:border-white/5 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
          <p>Version 1.0.0 Production Release</p>
          <p className="mt-1">
            Compatible across Windows 10/11, macOS (Intel & Apple Silicon), and Linux (X11 & Wayland).
          </p>
        </div>
      </div>
    </div>
  );
};
