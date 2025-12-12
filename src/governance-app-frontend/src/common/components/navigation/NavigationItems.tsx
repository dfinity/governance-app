import { LayoutDashboard, Network, Settings, Vote } from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'common.dashboard',
    href: '/',
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
    label: 'common.settings',
    href: '/settings',
    icon: Settings,
  },
];
