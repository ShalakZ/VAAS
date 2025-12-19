import { createContext, useContext, useState, useEffect } from 'react';

const ConfigContext = createContext(null);

export function ConfigProvider({ children, config: initialConfig }) {
  const [config, setConfig] = useState({
    teamsList: initialConfig?.teamsList || [
      'Unclassified',
      'Application',
      'System Admin',
      'Out of Linux Scope',
      'Out of Platform Scope',
    ],
    permissions: initialConfig?.permissions || {
      canModify: true,
      canModifyKb: true,
      canExport: true,
      canManageUsers: true,
      role: 'administrator',
    },
    userInfo: initialConfig?.userInfo || null,
    loading: true,
  });

  useEffect(() => {
    // Fetch config from API
    fetch('/config')
      .then(res => res.json())
      .then(data => {
        // Check if authentication is required but user is not authenticated
        if (data.requiresAuth && data.redirectUrl) {
          // Redirect to login page
          window.location.href = data.redirectUrl;
          return;
        }

        setConfig({
          teamsList: data.teamsList || config.teamsList,
          permissions: data.permissions || config.permissions,
          userInfo: data.userInfo || config.userInfo,
          loading: false,
        });
      })
      .catch(err => {
        console.error('Failed to fetch config:', err);
        // Keep default values on error
        setConfig(prev => ({ ...prev, loading: false }));
      });
  }, []);

  // Show loading state while checking auth
  if (config.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
