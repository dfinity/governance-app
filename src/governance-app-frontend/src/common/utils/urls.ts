export const safeParseUrl = (url: string | undefined | null): URL | null => {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
};
