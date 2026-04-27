import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from './colors';

export type ThemeName = 'light' | 'dark';

interface ThemeContextType {
  themeName: ThemeName;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  // Set light as default instead of system preference to fulfill user requirement.
  const [themeName, setThemeName] = useState<ThemeName>('light');

  const toggleTheme = () => {
    setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = themeName === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ themeName, colors, toggleTheme, setTheme: setThemeName }}>
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
