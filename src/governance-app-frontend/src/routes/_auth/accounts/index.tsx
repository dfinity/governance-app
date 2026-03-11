import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountsList } from '@features/accounts/components/AccountsList';
import { AccountsTotalCard } from '@features/accounts/components/AccountsTotalCard';
import { CreateSubAccountDialog } from '@features/accounts/components/CreateSubAccountDialog';
import { RecentTransactions } from '@features/accounts/components/RecentTransactions';
import { useSubaccounts } from '@features/accounts/hooks/useSubaccounts';

import { PageHeader } from '@components/PageHeader';
import { Skeleton } from '@components/Skeleton';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/accounts/')({
  component: AccountsPage,
  head: () => {
    const title = i18n.t(($) => $.common.head.accounts.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.accounts',
  },
});

function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { features } = useAdvancedFeatures();
  const enabled = features.subaccounts;
  const { data: accounts, isLoading } = useSubaccounts();

  useEffect(() => {
    if (!enabled) {
      navigate({ to: '/dashboard', replace: true });
    }
  }, [enabled, navigate]);

  if (!enabled) return null;

  const hasAccounts = !isLoading && accounts && accounts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(($) => $.accounts.title)}
        description={t(($) => $.accounts.description)}
        actions={<CreateSubAccountDialog />}
      />

      <AccountsTotalCard accounts={accounts ?? []} isLoading={isLoading} />

      {hasAccounts ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AccountsList accounts={accounts} />
          </div>
          <RecentTransactions />
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-lg font-medium">{t(($) => $.accounts.empty.title)}</p>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.accounts.empty.description)}
          </p>
        </div>
      )}
    </div>
  );
}
