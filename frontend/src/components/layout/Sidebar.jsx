export function Sidebar({
  isOpen,
  onClose,
  theme,
  toggleTheme,
  onNavigate,
  hasData,
  userInfo,
}) {
  const handleNavClick = (view) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white" id="sidebar-title">Menu</h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg w-8 h-8 flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => handleNavClick(hasData ? 'review' : 'upload')}
              className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors duration-200"
            >
              🏠 Home / Analysis
            </button>
            <button
              onClick={() => handleNavClick('kb')}
              className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors duration-200"
            >
              📚 Knowledge Base
            </button>

            {userInfo?.isAdmin && (
              <>
                <hr className="border-gray-200 dark:border-gray-700 my-4" />
                <button
                  onClick={() => handleNavClick('settings')}
                  className="block w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors duration-200"
                >
                  ⚙️ Settings
                </button>
              </>
            )}

            <hr className="border-gray-200 dark:border-gray-700 my-4" />
            <div className="flex items-center justify-between px-4 py-2">
              <span id="dark-mode-label" className="text-gray-700 dark:text-gray-200 font-medium">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={theme === 'dark'}
                aria-labelledby="dark-mode-label"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    theme === 'dark' ? 'translate-x-6' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="pt-4 border-t dark:border-gray-700">
            {userInfo?.authEnabled ? (
              <>
                <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="font-medium text-gray-800 dark:text-white">
                    {userInfo.displayName}
                  </div>
                  <div className="text-xs">
                    {userInfo.username} ({userInfo.roleDisplay})
                  </div>
                </div>
                <a
                  href="/logout"
                  className="block w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium text-sm transition-colors duration-200"
                >
                  🚪 Logout
                </a>
              </>
            ) : (
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                🔓 Authentication: Disabled
              </div>
            )}
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-4">
              VAAS v1.0 <br />
              © 2025 DevOps
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
