import { Button } from '../common';

export function Header({
  view,
  setView,
  currentFileName,
  hasData,
  theme,
  toggleTheme,
  onSidebarOpen,
  onNewAnalysis,
  onKbClick,
}) {
  return (
    <header className="mb-8 flex justify-between items-center">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button */}
        <button
          onClick={onSidebarOpen}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Open Menu"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src="/static/img/Logo.png" alt="Logo" className="h-12 w-auto" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          VAAS: Vulnerability Auto Assignment Solution
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Navigation */}
        <button
          onClick={() => hasData ? setView('review') : setView('upload')}
          className={`px-3 py-1 rounded transition-colors ${
            view === 'upload' || view === 'review'
              ? 'bg-gray-200 dark:bg-gray-700 font-bold dark:text-white'
              : 'text-blue-600 dark:text-blue-400 hover:underline'
          }`}
        >
          Analysis
        </button>

        {view === 'review' && (
          <button
            onClick={onNewAnalysis}
            className="px-3 py-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs font-bold"
          >
            Upload New File ↺
          </button>
        )}

        <button
          onClick={onKbClick}
          className={`px-3 py-1 rounded transition-colors ${
            view === 'kb'
              ? 'bg-gray-200 dark:bg-gray-700 font-bold dark:text-white'
              : 'text-blue-600 dark:text-blue-400 hover:underline'
          }`}
        >
          Knowledge Base
        </button>

        {currentFileName && view === 'review' && (
          <span className="ml-4 text-gray-600 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 px-3 py-1 rounded">
            📄 {currentFileName}
          </span>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ml-2"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <span className="text-yellow-400 text-xl">☀️</span>
          ) : (
            <span className="text-gray-600 text-xl">🌙</span>
          )}
        </button>
      </div>
    </header>
  );
}
