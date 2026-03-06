import { LayoutDashboard, User, Vote } from 'lucide-react';

import { NeuronIcon } from '@components/icons/NeuronIcon';

import { NeuronIcon } from '@components/icons/NeuronIcon';
import { FileRoutesByTo } from '@/routeTree.gen';

type AuthRoutePaths = Exclude<keyof FileRoutesByTo, '/'>;

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
    href: '/neurons',
    icon: NeuronIcon,
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
