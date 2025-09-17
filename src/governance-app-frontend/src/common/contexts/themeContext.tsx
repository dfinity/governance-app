import { createContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (themePreference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
