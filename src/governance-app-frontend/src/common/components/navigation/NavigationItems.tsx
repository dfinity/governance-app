import { LayoutDashboard, Settings, Vote, Wallet } from 'lucide-react';

import { NeuronIcon } from '@components/icons/NeuronIcon';

import { FileRoutesByTo } from '@/routeTree.gen';

type AuthRoutePaths = Exclude<keyof FileRoutesByTo, '/'>;

export interface NavigationItem {
  label: string;
  tabLabel: string;
  href: AuthRoutePaths;
  icon: React.ElementType;
}

const baseItems: NavigationItem[] = [
  {
    label: 'common.dashboard',
    tabLabel: 'common.tabs.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'common.stakes',
    tabLabel: 'common.tabs.stakes',
    href: '/neurons',
    icon: NeuronIcon,
  },
  {
    label: 'common.voting',
    tabLabel: 'common.tabs.voting',
    href: '/voting',
    icon: Vote,
  },
  {
    label: 'common.settings',
    tabLabel: 'common.tabs.settings',
    href: '/settings',
    icon: Settings,
  },
];

const accountsItem: NavigationItem = {
  label: 'common.accounts',
  tabLabel: 'common.tabs.accounts',
  href: '/accounts',
  icon: Wallet,
};

export const getNavigationItems = (options: { subaccountsEnabled: boolean }): NavigationItem[] => {
  if (!options.subaccountsEnabled) return baseItems;

  const items = [...baseItems];
  items.splice(1, 0, accountsItem);
  return items;
};
