import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';

import { useRenameSubAccount } from '../hooks/useRenameSubAccount';
import { SubAccountNameDialog } from './SubAccountNameDialog';

type Props = {
  accountId: string;
  currentName: string;
};

export const RenameSubAccountDialog = ({ accountId, currentName }: Props) => {
  const { t } = useTranslation();
  const renameSubAccount = useRenameSubAccount();

  return (
    <SubAccountNameDialog
      title={t(($) => $.accounts.renameSubAccount.title)}
      description={t(($) => $.accounts.renameSubAccount.description)}
      nameLabel={t(($) => $.accounts.renameSubAccount.nameLabel)}
      placeholder={t(($) => $.accounts.renameSubAccount.namePlaceholder)}
      confirmLabel={t(($) => $.accounts.renameSubAccount.confirm)}
      processingMessage={(name) =>
        t(($) => $.accounts.renameSubAccount.renaming, { name })
      }
      successMessage={(name) =>
        t(($) => $.accounts.renameSubAccount.success, { name })
      }
      errorFallback={t(($) => $.accounts.renameSubAccount.error)}
      inputId={`subaccount-rename-${accountId}`}
      initialName={currentName}
      isSubmitDisabled={(trimmedName) => trimmedName === currentName}
      onSubmit={(name) =>
        renameSubAccount.mutateAsync({ accountId, newName: name }).then(() => undefined)
      }
      trigger={(open) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={open}
          aria-label={t(($) => $.accounts.renameSubAccount.ariaLabel)}
          title={t(($) => $.accounts.renameSubAccount.ariaLabel)}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    />
  );
};
