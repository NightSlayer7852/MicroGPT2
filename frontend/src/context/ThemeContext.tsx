// src/context/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Define the theme types
export type Theme = 'light' | 'dark';

// Define the context shape
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void; // <-- 1. ADD THIS so SettingsPage can use it
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {}, // <-- 2. ADD THIS fallback
});

// Create the provider component
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Use system preference as default, or fallback to light
  const initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  // Notice we are just using the standard React `setTheme` here
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Apply theme to the <body> tag whenever it changes
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // Read stored preference on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('app-theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    // 3. EXPOSE `setTheme` HERE in the provider value
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a hook to use the theme context easily
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};