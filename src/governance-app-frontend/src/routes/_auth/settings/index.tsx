import { isNullish } from '@dfinity/utils';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from 'ic-use-internet-identity';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AddressBookCard } from '@features/addressBook/components/AddressBookCard';
import { AccountIdCard } from '@features/userAccount/components/AccountIdCard';
import { AdvancedFeaturesCard } from '@features/userAccount/components/AdvancedFeaturesCard';
import { GovernanceAccessCard } from '@features/userAccount/components/GovernanceAccessCard';
import { ManageIICard } from '@features/userAccount/components/ManageIICard';
import { PrincipalCard } from '@features/userAccount/components/PrincipalCard';
import { ShortcutsCard } from '@features/userAccount/components/ShortcutsCard';
import { SystemContextCard } from '@features/userAccount/components/SystemContextCard';
import { ThemeCard } from '@features/userAccount/components/ThemeCard';

import { Button } from '@components/button';
import { Card } from '@components/Card';
import { PageHeader } from '@components/PageHeader';
import { useLogout } from '@hooks/useLogout';

import i18n from '@/i18n/config';

type SettingsSearchParams = {
  openAddressBook?: boolean;
};

export const Route = createFileRoute('/_auth/settings/')({
  validateSearch: (search: Record<string, unknown>): SettingsSearchParams => ({
    openAddressBook:
      search.openAddressBook === 'true' || search.openAddressBook === true ? true : undefined,
  }),
  component: Settings,
  head: () => {
    const title = i18n.t(($) => $.common.head.settings.title);

    return {
      meta: [{ title }],
    };
  },
  staticData: {
    title: 'common.settings',
  },
});

function Settings() {
  const { identity } = useInternetIdentity();
  const { t } = useTranslation();
  const navigate = useNavigate({ from: Route.fullPath });
  const { openAddressBook } = Route.useSearch();
  const logout = useLogout();

  const handleAddressBookOpenChange = (open: boolean) => {
    navigate({ search: open ? { openAddressBook: true } : {}, replace: true });
  };

  if (isNullish(identity)) return null;

  return (
    <div className="flex flex-col gap-12 pb-20">
      <PageHeader
        title={t(($) => $.common.settings)}
        description={t(($) => $.userAccount.settingsDescription)}
      />

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{t(($) => $.userAccount.identity)}</h2>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.identityDescription)}
          </p>
        </div>
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="flex flex-col divide-y">
            <div className="px-6 py-5">
              <PrincipalCard />
            </div>
            <div className="px-6 py-5">
              <AccountIdCard />
            </div>
            <div className="px-6 py-5">
              <ManageIICard />
            </div>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{t(($) => $.addressBook.title)}</h2>
        </div>
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="px-6 py-5">
            <AddressBookCard
              isOpen={!!openAddressBook}
              onOpenChange={handleAddressBookOpenChange}
            />
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {t(($) => $.userAccount.advancedFeatures.title)}
          </h2>
        </div>
        <Card className="overflow-hidden p-0 shadow-sm">
          <AdvancedFeaturesCard />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{t(($) => $.userAccount.governance.title)}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-6 shadow-sm">
            <GovernanceAccessCard />
          </Card>
          <Card className="p-6 shadow-sm">
            <SystemContextCard />
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{t(($) => $.userAccount.appearance)}</h2>
        </div>
        <Card className="overflow-hidden p-0 shadow-sm">
          <div className="flex flex-col divide-y">
            <div className="px-6 py-5">
              <ThemeCard />
            </div>
            <div className="px-6 py-5">
              <ShortcutsCard />
            </div>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={logout}
          className="w-full self-start border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto dark:border-destructive/60 dark:text-destructive-foreground dark:hover:bg-destructive/10"
          data-testid="logout-btn"
        >
          <LogOut className="mr-2 size-5" />
          {t(($) => $.common.logout)}
        </Button>
      </section>
    </div>
  );
}
