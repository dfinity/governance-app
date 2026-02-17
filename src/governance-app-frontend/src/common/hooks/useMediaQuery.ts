import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
