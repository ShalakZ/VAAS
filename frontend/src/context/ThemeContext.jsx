import { createContext, useContext } from 'react';
import { useDarkMode } from '../hooks';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, toggleTheme] = useDarkMode();

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
