import { createContext } from 'react';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

interface ThemeContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContext | undefined>(undefined);
