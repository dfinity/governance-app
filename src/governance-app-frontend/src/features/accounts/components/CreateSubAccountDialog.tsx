import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';
import { SubAccountDialogMode } from '../types';
import { SubAccountNameDialog } from './SubAccountNameDialog';

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const createSubAccount = useCreateSubAccount();

  return (
    <SubAccountNameDialog
      mode={SubAccountDialogMode.Create}
      inputId="subaccount-name"
      initialName=""
      onSubmit={createSubAccount.mutateAsync}
      trigger={(open) => (
        <Button variant="secondary" onClick={open}>
          <Plus aria-hidden="true" />
          {t(($) => $.accounts.createSubAccount.button)}
        </Button>
      )}
    />
  );
};
