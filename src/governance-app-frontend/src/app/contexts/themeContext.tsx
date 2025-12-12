import { createContext } from 'react';

export enum Theme {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: Theme.System,
  setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);
