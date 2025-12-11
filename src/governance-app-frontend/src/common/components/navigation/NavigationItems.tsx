import { LayoutDashboard, Network, Settings, Vote } from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Stakes',
    href: '/stakes',
    icon: Network,
  },
  {
    label: 'Voting',
    href: '/voting',
    icon: Vote,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];
