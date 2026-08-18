// src/context/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreset = 'cosmic' | 'amber' | 'nature' | 'vercel';

interface ThemeContextType {
  theme: ThemeMode;
  preset: ThemePreset;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  preset: 'cosmic',
  toggleTheme: () => {},
  setTheme: () => {},
  setPreset: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const initialMode: ThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
  
  const [theme, setTheme] = useState<ThemeMode>(initialMode);
  const [preset, setPreset] = useState<ThemePreset>('cosmic');

  useEffect(() => {
    const modeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
    const presetClass = `theme-${preset}`;
    
    document.body.className = `${presetClass} ${modeClass}`;
    localStorage.setItem('app-theme-mode', theme);
    localStorage.setItem('app-theme-preset', preset);
  }, [theme, preset]);

  useEffect(() => {
    const storedMode = localStorage.getItem('app-theme-mode');
    if (storedMode === 'dark' || storedMode === 'light') {
      setTheme(storedMode);
    }
    const storedPreset = localStorage.getItem('app-theme-preset') as ThemePreset;
    if (['cosmic', 'amber', 'nature', 'vercel'].includes(storedPreset)) {
      setPreset(storedPreset);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, preset, toggleTheme, setTheme, setPreset }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};