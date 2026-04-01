import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAddHotkey } from '@features/stakes/hooks/useAddHotkey';

import { Alert, AlertDescription } from '@components/Alert';
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
import { DIALOG_RESET_DELAY_MS, IS_TESTNET } from '@constants/extra';
import { errorMessage } from '@utils/error';
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

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setPrincipalId('');
      setValidationError(null);
    }, DIALOG_RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const handleSubmit =
    (execute: (fn: () => Promise<unknown>) => void) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = principalId.trim();
      if (!trimmed || !getPrincipalFromString(trimmed)) {
        setValidationError(t(($) => $.devActionsModal.addHotkey.errors.invalidPrincipal));
        return;
      }

      execute(() =>
        addHotkeyMutation.mutateAsync({ neuronId: neuron.neuronId, principal: trimmed }),
      );
    };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="h-auto py-4 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
        onClick={() => setOpen(true)}
      >
        {t(($) => $.devActionsModal.addHotkey.title)}
      </Button>

      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={t(($) => $.devActionsModal.addHotkey.confirming)}
        successMessage={t(($) => $.devActionsModal.addHotkey.success)}
        navBlockerDescription={t(($) => $.devActionsModal.addHotkey.confirming)}
      >
        {({ execute, close }) => (
          <form onSubmit={handleSubmit(execute)} className="flex min-h-0 flex-1 flex-col">
            <MutationDialogHeader>
              <ResponsiveDialogTitle>
                {t(($) => $.devActionsModal.addHotkey.title)}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t(($) => $.devActionsModal.addHotkey.description)}
              </ResponsiveDialogDescription>
            </MutationDialogHeader>

            <MutationDialogBody className="space-y-4 px-4 py-4 md:px-0">
              <div className="space-y-1">
                <Label htmlFor="hotkey-principal-input">
                  {t(($) => $.devActionsModal.addHotkey.principalLabel)}
                </Label>
                <Input
                  id="hotkey-principal-input"
                  className="h-14 border-2 text-lg font-semibold focus-visible:ring-0"
                  onChange={(e) => {
                    setPrincipalId(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                  ref={inputRef}
                  value={principalId}
                  type="text"
                />
              </div>

              {validationError && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
            </MutationDialogBody>

            <MutationDialogFooter className="md:justify-end">
              <Button type="button" variant="ghost" onClick={close}>
                {t(($) => $.devActionsModal.common.close)}
              </Button>
              <Button type="submit">{t(($) => $.devActionsModal.addHotkey.confirm)}</Button>
            </MutationDialogFooter>
          </form>
        )}
      </MutationDialog>
    </>
  );
};
