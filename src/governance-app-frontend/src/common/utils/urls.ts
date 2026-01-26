export const safeParseUrl = (url: string | undefined | null): URL | null => {
  if (!url) return null;
  try {
    return new URL(url);
  } catch (err) {
    console.error('safeParseUrl: failed to parse URL:', url, err);
    return null;
  }
};

export const isExternalLink = (href?: string): boolean => {
  if (!href) return false;
  return href.startsWith('http://') || href.startsWith('https://');
};
