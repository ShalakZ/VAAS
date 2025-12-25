import PropTypes from 'prop-types';
import { WorkflowSteps } from '../common';

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
  onSettingsClick,
  exportProgress,
  isAdmin,
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 flex-shrink-0">
      {/* Top row: Logo/Title and Theme Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger Menu Button */}
          <button
            onClick={onSidebarOpen}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title="Open Menu"
            aria-label="Open navigation menu"
          >
            <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/static/img/Logo.png" alt="Logo" className="h-12 w-auto flex-shrink-0" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
            <span className="hidden lg:inline">VAAS: Vulnerability Auto Assignment Solution</span>
            <span className="lg:hidden">VAAS</span>
          </h1>
        </div>

        {/* Dark Mode Toggle - always visible */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? (
            <span className="text-yellow-400 text-xl" aria-hidden="true">☀️</span>
          ) : (
            <span className="text-gray-600 text-xl" aria-hidden="true">🌙</span>
          )}
        </button>
      </div>

      {/* Navigation row - wraps on small screens */}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
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

        {isAdmin && (
          <button
            onClick={onSettingsClick}
            className={`px-3 py-1 rounded transition-colors ${
              view === 'settings'
                ? 'bg-gray-200 dark:bg-gray-700 font-bold dark:text-white'
                : 'text-blue-600 dark:text-blue-400 hover:underline'
            }`}
          >
            Settings
          </button>
        )}

        {currentFileName && view === 'review' && (
          <span className="text-gray-600 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 px-3 py-1 rounded text-sm truncate max-w-xs">
            📄 {currentFileName}
          </span>
        )}
      </div>

      {/* Workflow Steps - only show for upload/review views */}
      {(view === 'upload' || view === 'review') && (
        <div className="flex justify-center">
          <WorkflowSteps currentStep={view} hasData={hasData} exportProgress={exportProgress} />
        </div>
      )}
    </header>
  );
}

Header.propTypes = {
  view: PropTypes.string,
  setView: PropTypes.func,
  currentFileName: PropTypes.string,
  hasData: PropTypes.bool,
  theme: PropTypes.string,
  toggleTheme: PropTypes.func,
  onSidebarOpen: PropTypes.func,
  onNewAnalysis: PropTypes.func,
  onKbClick: PropTypes.func,
  onSettingsClick: PropTypes.func,
  exportProgress: PropTypes.number,
  isAdmin: PropTypes.bool,
};
