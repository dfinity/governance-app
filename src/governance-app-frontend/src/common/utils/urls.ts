export const safeParseUrl = (url: string | undefined | null): URL | null => {
  if (!url) return null;
  try {
    return new URL(url);
  } catch (err) {
    console.error('safeParseUrl: failed to parse URL:', url, err);
    return null;
  }
};
