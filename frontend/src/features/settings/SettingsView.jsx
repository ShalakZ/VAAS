import { useState } from 'react';
import { UsersPanel, LdapPanel, DatabasePanel, KnowledgeBaseSettingsPanel, LogsPanel } from './panels';
import { SETTINGS_CATEGORIES } from './constants';

const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  kb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  logs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export function SettingsView() {
  const [activePanel, setActivePanel] = useState('users');

  return (
    <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 max-w-6xl w-full mx-auto h-[calc(100vh-200px)] min-h-[500px] max-h-[750px]">
      {/* Sidebar */}
      <div className="w-56 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-800/80 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-white tracking-tight">Settings</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">System Configuration</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {SETTINGS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActivePanel(cat.id)}
              className={`settings-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left cursor-pointer ${
                activePanel === cat.id
                  ? 'active bg-white dark:bg-slate-700/60 shadow-sm border border-gray-200/60 dark:border-gray-600/40'
                  : 'hover:bg-white/60 dark:hover:bg-slate-700/30'
              }`}
            >
              <span className={`flex-shrink-0 transition-colors ${
                activePanel === cat.id
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {icons[cat.icon]}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`font-medium block text-[13px] tracking-tight ${
                  activePanel === cat.id
                    ? 'text-gray-800 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}>{cat.label}</span>
                <span className={`text-[10px] font-medium ${
                  activePanel === cat.id
                    ? 'text-sky-600/80 dark:text-sky-400/80'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {cat.description}
                </span>
              </div>
              <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-all ${
                activePanel === cat.id
                  ? 'text-sky-500 dark:text-sky-400 translate-x-0.5'
                  : 'text-gray-300 dark:text-gray-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-t from-slate-100 to-transparent dark:from-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-500 dark:text-gray-400">VAAS</span>
              <span className="ml-1">v1.0</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse"></span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Panel */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800 dark:to-gray-800">
        <div key={activePanel} className="settings-panel-content h-full">
          {activePanel === 'users' && <UsersPanel />}
          {activePanel === 'ldap' && <LdapPanel />}
          {activePanel === 'database' && <DatabasePanel />}
          {activePanel === 'knowledgebase' && <KnowledgeBaseSettingsPanel />}
          {activePanel === 'logs' && <LogsPanel />}
        </div>
      </div>
    </div>
  );
}
