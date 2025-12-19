import { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDarkMode } from '../hooks';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, toggleTheme] = useDarkMode();

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
