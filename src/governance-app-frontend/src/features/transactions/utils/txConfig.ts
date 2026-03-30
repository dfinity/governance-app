import {
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  CircleQuestionMark,
  Coins,
  Flame,
  HandCoins,
  Lock,
  type LucideIcon,
} from 'lucide-react';

import { TransactionType } from '@features/account/types';

export const txConfig: Record<
  TransactionType,
  {
    icon: LucideIcon;
    iconBgClasses: string;
    amountClasses: string;
    sign: string;
    labelKey: 'sent' | 'received' | 'staked' | 'minted' | 'selfTransfer' | 'burned' | 'approved';
    latestLabelKey:
      | 'latestSent'
      | 'latestReceived'
      | 'latestStaked'
      | 'latestMinted'
      | 'latestSelfTransfer'
      | 'latestBurned'
      | 'latestApproved';
    addressDirection: 'fromAddress' | 'intoAddress' | 'toAddress' | null;
  }
> = {
  [TransactionType.RECEIVE]: {
    icon: ArrowDownToLine,
    iconBgClasses:
      'bg-emerald-200/30 text-emerald-800 dark:bg-emerald-100/10 dark:text-emerald-400',
    amountClasses: 'text-emerald-800 dark:text-emerald-400',
    sign: '+',
    labelKey: 'received',
    latestLabelKey: 'latestReceived',
    addressDirection: 'fromAddress',
  },
  [TransactionType.SEND]: {
    icon: ArrowUp,
    iconBgClasses: 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
    amountClasses: 'text-red-800 dark:text-red-400',
    sign: '-',
    labelKey: 'sent',
    latestLabelKey: 'latestSent',
    addressDirection: 'toAddress',
  },
  [TransactionType.STAKE]: {
    icon: Lock,
    iconBgClasses: 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
    amountClasses: 'text-red-800 dark:text-red-400',
    sign: '-',
    labelKey: 'staked',
    latestLabelKey: 'latestStaked',
    addressDirection: 'intoAddress',
  },
  [TransactionType.SELF]: {
    icon: ArrowUpDown,
    iconBgClasses: 'bg-muted text-muted-foreground',
    amountClasses: 'text-muted-foreground',
    sign: '',
    labelKey: 'selfTransfer',
    latestLabelKey: 'latestSelfTransfer',
    addressDirection: null,
  },
  [TransactionType.MINT]: {
    icon: Coins,
    iconBgClasses:
      'bg-emerald-200/30 text-emerald-800 dark:bg-emerald-100/10 dark:text-emerald-400',
    amountClasses: 'text-emerald-800 dark:text-emerald-400',
    sign: '+',
    labelKey: 'minted',
    latestLabelKey: 'latestMinted',
    addressDirection: null,
  },
  [TransactionType.BURN]: {
    icon: Flame,
    iconBgClasses: 'bg-red-200/30 text-red-800 dark:bg-red-100/10 dark:text-red-400',
    amountClasses: 'text-red-800 dark:text-red-400',
    sign: '-',
    labelKey: 'burned',
    latestLabelKey: 'latestBurned',
    addressDirection: null,
  },
  [TransactionType.APPROVE]: {
    icon: HandCoins,
    iconBgClasses: 'bg-muted text-muted-foreground',
    amountClasses: 'text-muted-foreground',
    sign: '',
    labelKey: 'approved',
    latestLabelKey: 'latestApproved',
    addressDirection: null,
  },
  [TransactionType.UNKNOWN]: {
    icon: CircleQuestionMark,
    iconBgClasses: 'bg-muted text-muted-foreground',
    amountClasses: 'text-muted-foreground',
    sign: '',
    labelKey: 'sent',
    latestLabelKey: 'latestSent',
    addressDirection: null,
  },
};
