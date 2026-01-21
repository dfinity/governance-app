import { useEffect, useState } from 'react';

const BETA_BANNER_COLLAPSED_KEY = 'beta-banner-collapsed';

export const useBetaBannerCollapsed = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(BETA_BANNER_COLLAPSED_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(BETA_BANNER_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsCollapsed(localStorage.getItem(BETA_BANNER_COLLAPSED_KEY) === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-window updates
    window.addEventListener('beta-banner-toggle', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beta-banner-toggle', handleStorageChange);
    };
  }, []);

  return { isCollapsed, setIsCollapsed };
};

