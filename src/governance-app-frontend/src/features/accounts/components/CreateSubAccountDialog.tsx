import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { NavigationBlockerDialog } from '@components/NavigationBlockerDialog';

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';
import { DialogMode } from '../types';
import { SubAccountNameDialog } from './SubAccountNameDialog';

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const createSubAccount = useCreateSubAccount();

  return (
    <SubAccountNameDialog
      mode={DialogMode.Create}
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
