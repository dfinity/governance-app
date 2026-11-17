export enum Theme {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

// Browser UI color (`theme-color` meta tag). Matches `--icp-bg` in main.css.
export const THEME_COLOR: Record<Theme.Dark | Theme.Light, string> = {
  [Theme.Dark]: '#14110d',
  [Theme.Light]: '#faf9f5',
};
