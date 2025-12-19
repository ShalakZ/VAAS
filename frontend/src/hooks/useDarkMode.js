import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vaas-theme';

/**
 * Dark mode hook with localStorage persistence
 * @returns {[string, Function]} - [theme, toggleTheme]
 */
export function useDarkMode() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  });

  useEffect(() => {
    const root = globalThis.document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.remove('bg-gray-50', 'text-gray-800');
      document.body.classList.add('bg-gray-900', 'text-gray-100');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('bg-gray-900', 'text-gray-100');
      document.body.classList.add('bg-gray-50', 'text-gray-800');
    }

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return [theme, toggleTheme];
}
