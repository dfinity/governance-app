import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { errorNotification, successNotification } from '@utils/notification';

import { useCreateSubAccount } from '../hooks/useCreateSubAccount';

export const CreateSubAccountDialog = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createSubAccount = useCreateSubAccount();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await createSubAccount.mutateAsync(trimmed);
      successNotification({
        description: t(($) => $.accounts.createSubAccount.success, { name: trimmed }),
      });
      setName('');
      setOpen(false);
    } catch (err) {
      errorNotification({
        description:
          err instanceof Error
            ? err.message
            : t(($) => $.accounts.createSubAccount.error),
      });
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setName('');
    setOpen(value);
  };

  const pending = createSubAccount.isPending;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {t(($) => $.accounts.createSubAccount.button)}
      </Button>

      <ResponsiveDialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.accounts.createSubAccount.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.accounts.createSubAccount.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="subaccount-name">
              {t(($) => $.accounts.createSubAccount.nameLabel)}
            </Label>
            <Input
              id="subaccount-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(($) => $.accounts.createSubAccount.namePlaceholder)}
              disabled={pending}
              autoFocus
              autoComplete="off"
            />
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {t(($) => $.common.cancel)}
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t(($) => $.accounts.createSubAccount.creating)}
                </>
              ) : (
                t(($) => $.accounts.createSubAccount.confirm)
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
