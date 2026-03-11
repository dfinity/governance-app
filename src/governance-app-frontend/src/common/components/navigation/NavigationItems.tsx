import { LayoutDashboard, Settings, Vote, Wallet } from 'lucide-react';

import { NeuronIcon } from '@components/icons/NeuronIcon';

import { FileRoutesByTo } from '@/routeTree.gen';

type AuthRoutePaths = Exclude<keyof FileRoutesByTo, '/'>;

export interface NavigationItem {
  label: string;
  href: AuthRoutePaths;
  icon: React.ElementType;
}

const baseItems: NavigationItem[] = [
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
    label: 'common.settings',
    href: '/settings',
    icon: Settings,
  },
];

const accountsItem: NavigationItem = {
  label: 'common.accounts',
  href: '/accounts',
  icon: Wallet,
};

export const getNavigationItems = (options: {
  subaccountsEnabled: boolean;
}): NavigationItem[] => {
  if (!options.subaccountsEnabled) return baseItems;

  const items = [...baseItems];
  items.splice(1, 0, accountsItem);
  return items;
};
