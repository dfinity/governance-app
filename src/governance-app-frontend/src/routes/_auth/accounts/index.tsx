import { createFileRoute, redirect } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { AccountsList } from '@features/accounts/components/AccountsList';
import { AccountsTotalCard } from '@features/accounts/components/AccountsTotalCard';
import { CreateSubAccountDialog } from '@features/accounts/components/CreateSubAccountDialog';
import { RecentTransactions } from '@features/accounts/components/RecentTransactions';

import { PageHeader } from '@components/PageHeader';
import { readFromStorage as readAdvancedFeaturesFromStorage } from '@hooks/useAdvancedFeatures';

import i18n from '@/i18n/config';

export const Route = createFileRoute('/_auth/accounts/')({
  component: AccountsPage,
  beforeLoad: () => {
    const features = readAdvancedFeaturesFromStorage();

    if (!features.subaccounts) throw redirect({ to: '/dashboard', replace: true });
  },
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(($) => $.accounts.title)}
        description={t(($) => $.accounts.description)}
        actions={<CreateSubAccountDialog />}
      />

      <AccountsTotalCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountsList />
        </div>
        <RecentTransactions />
      </div>
    </div>
  );
}
