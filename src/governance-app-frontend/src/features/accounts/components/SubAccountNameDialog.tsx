import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogDescription, ResponsiveDialogTitle } from '@components/ResponsiveDialog';

import { SubAccountDialogMode } from '../types';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 24;

type SubAccountNameDialogConfig = {
  mode: SubAccountDialogMode;
  inputId: string;
  initialName: string;
  isSubmitDisabled?: (trimmedName: string) => boolean;
  onSubmit: (trimmedName: string) => Promise<unknown>;
  trigger: (open: () => void) => ReactNode;
};

function useDialogTranslations(mode: SubAccountDialogMode) {
  const { t } = useTranslation();

  if (mode === SubAccountDialogMode.Create) {
    return {
      title: t(($) => $.accounts.createSubAccount.title),
      description: t(($) => $.accounts.createSubAccount.description),
      nameLabel: t(($) => $.accounts.createSubAccount.nameLabel),
      placeholder: undefined,
      confirmLabel: t(($) => $.accounts.createSubAccount.confirm),
      processingMessage: (name: string) => t(($) => $.accounts.createSubAccount.creating, { name }),
      successMessage: (name: string) => t(($) => $.accounts.createSubAccount.success, { name }),
      errorFallback: t(($) => $.accounts.createSubAccount.error),
    };
  }

  return {
    title: t(($) => $.accounts.renameSubAccount.title),
    description: t(($) => $.accounts.renameSubAccount.description),
    nameLabel: t(($) => $.accounts.renameSubAccount.nameLabel),
    placeholder: t(($) => $.accounts.renameSubAccount.namePlaceholder),
    confirmLabel: t(($) => $.accounts.renameSubAccount.confirm),
    processingMessage: (name: string) => t(($) => $.accounts.renameSubAccount.renaming, { name }),
    successMessage: (name: string) => t(($) => $.accounts.renameSubAccount.success, { name }),
    errorFallback: t(($) => $.accounts.renameSubAccount.error),
  };
}

export const SubAccountNameDialog = ({
  mode,
  inputId,
  initialName,
  isSubmitDisabled,
  onSubmit,
  trigger,
}: SubAccountNameDialogConfig) => {
  const { t } = useTranslation();
  const translations = useDialogTranslations(mode);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);

  const trimmedName = name.trim();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(initialName);
    }
  }, [open, initialName]);

  const handleSubmit = (execute: (fn: () => Promise<unknown>) => void) => (e: FormEvent) => {
    e.preventDefault();
    if (trimmedName.length < MIN_NAME_LENGTH) return;
    execute(() => onSubmit(trimmedName));
  };

  return (
    <>
      {trigger(() => setOpen(true))}
      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={translations.processingMessage(trimmedName)}
        successMessage={translations.successMessage(trimmedName)}
        navBlockerDescription={translations.processingMessage(trimmedName)}
        errorFallbackMessage={translations.errorFallback}
      >
        {({ execute, close }) => (
          <form onSubmit={handleSubmit(execute)} className="flex min-h-0 flex-1 flex-col">
            <MutationDialogHeader>
              <ResponsiveDialogTitle>{translations.title}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>{translations.description}</ResponsiveDialogDescription>
            </MutationDialogHeader>

            <MutationDialogBody className="space-y-2 px-4 py-4 md:px-0">
              <Label htmlFor={inputId}>{translations.nameLabel}</Label>
              <Input
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={translations.placeholder}
                minLength={MIN_NAME_LENGTH}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                autoComplete="off"
              />
            </MutationDialogBody>

            <MutationDialogFooter className="md:justify-end">
              <Button type="button" variant="ghost" onClick={close}>
                {t(($) => $.common.cancel)}
              </Button>
              <Button
                type="submit"
                disabled={trimmedName.length < MIN_NAME_LENGTH || isSubmitDisabled?.(trimmedName)}
              >
                {translations.confirmLabel}
              </Button>
            </MutationDialogFooter>
          </form>
        )}
      </MutationDialog>
    </>
  );
};
