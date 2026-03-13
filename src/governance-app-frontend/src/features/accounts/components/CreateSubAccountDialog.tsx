import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';
import { SubAccountNameDialog } from './SubAccountNameDialog';

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const createSubAccount = useCreateSubAccount();

  return (
    <SubAccountNameDialog
      title={t(($) => $.accounts.createSubAccount.title)}
      description={t(($) => $.accounts.createSubAccount.description)}
      nameLabel={t(($) => $.accounts.createSubAccount.nameLabel)}
      confirmLabel={t(($) => $.accounts.createSubAccount.confirm)}
      processingMessage={(name) => t(($) => $.accounts.createSubAccount.creating, { name })}
      successMessage={(name) => t(($) => $.accounts.createSubAccount.success, { name })}
      errorFallback={t(($) => $.accounts.createSubAccount.error)}
      inputId="subaccount-name"
      initialName=""
      onSubmit={(name) => createSubAccount.mutateAsync(name).then(() => undefined)}
      trigger={(open) => (
        <Button variant="secondary" onClick={open}>
          <Plus aria-hidden="true" />
          {t(($) => $.accounts.createSubAccount.button)}
        </Button>
      )}
      blockingContent={(name) => (
        <NavigationBlockerDialog
          isBlocked={true}
          description={t(($) => $.accounts.createSubAccount.creating, { name })}
        />
      )}
    />
  );
};
