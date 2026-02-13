import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAddHotkey } from '@features/stakes/hooks/useAddHotkey';

import { Alert, AlertDescription } from '@components/Alert';
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
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { IS_TESTNET } from '@constants/extra';
import { errorMessage } from '@utils/error';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { getPrincipalFromString } from '@utils/principal';

type Props = {
  neuron: NeuronInfo;
};

export const AddHotkeyModal = ({ neuron }: Props) => {
  if (!IS_TESTNET) throw errorMessage('addHotkeyModal', 'the environment is not "testnet"');

  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const addHotkeyMutation = useAddHotkey();

  const [open, setOpen] = useState(false);
  const [principalId, setPrincipalId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPrincipalId('');
      setValidationError(null);
    }
  };

  const handlePrincipalChange = (value: string) => {
    setPrincipalId(value);
    setValidationError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = principalId.trim();
    if (!trimmed || !getPrincipalFromString(trimmed)) {
      setValidationError(t(($) => $.devActionsModal.addHotkey.errors.invalidPrincipal));
      return;
    }

    setPending(true);
    try {
      await addHotkeyMutation.mutateAsync({
        neuronId: neuron.neuronId,
        principal: trimmed,
      });
      successNotification({
        description: t(($) => $.devActionsModal.addHotkey.success),
      });
      setPrincipalId('');
      setPending(false);
      setOpen(false);
    } catch (error) {
      setPending(false);
      errorNotification({
        description: mapCanisterError(error as Error),
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="h-auto py-4 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
        >
          {t(($) => $.devActionsModal.addHotkey.title)}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.devActionsModal.addHotkey.title)}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t(($) => $.devActionsModal.addHotkey.description)}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="hotkey-principal-input">
                {t(($) => $.devActionsModal.addHotkey.principalLabel)}
              </Label>
              <Input
                id="hotkey-principal-input"
                className="h-14 border-2 !text-lg font-semibold focus-visible:ring-0"
                onChange={(e) => handlePrincipalChange(e.target.value)}
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                ref={inputRef}
                value={principalId}
                disabled={pending}
                type="text"
              />
            </div>

            {validationError && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {t(($) => $.devActionsModal.common.close)}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(($) => $.devActionsModal.addHotkey.confirming)}
                </>
              ) : (
                t(($) => $.devActionsModal.addHotkey.confirm)
              )}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
