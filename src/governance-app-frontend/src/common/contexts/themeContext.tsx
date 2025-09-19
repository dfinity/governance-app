import { createContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContext {
  themePreference: ThemePreference;
  setThemePreference: (themePreference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContext | undefined>(undefined);
