import { useMatches } from '@tanstack/react-router';

/** True on a route that sets the `hidesBottomNav` flag in its `staticData`. */
export const useHidesBottomNav = () =>
  useMatches({ select: (matches) => matches.some((match) => match.staticData.hidesBottomNav) });
