import { LayoutDashboard, Network, User, Vote } from 'lucide-react';

import { FileRoutesByFullPath } from '@/routeTree.gen';

type AuthRoutePaths = Exclude<keyof FileRoutesByFullPath, '/'>;

export interface NavigationItem {
  label: string;
  href: AuthRoutePaths;
  icon: React.ElementType;
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'common.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'common.stakes',
    href: '/stakes',
    icon: Network,
  },
  {
    label: 'common.voting',
    href: '/voting',
    icon: Vote,
  },
  {
    label: 'common.accounts',
    href: '/account',
    icon: User,
  },
];
