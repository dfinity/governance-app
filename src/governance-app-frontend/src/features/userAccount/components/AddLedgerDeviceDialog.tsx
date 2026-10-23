import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Check, Usb } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
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
import { Spinner } from '@components/Spinner';
import type { LedgerIdentity } from '@common/ledger/ledgerIdentity';

import { useConnectLedgerDevice } from '../hooks/useConnectLedgerDevice';
import { useRegisterHardwareWallet } from '../hooks/useRegisterHardwareWallet';

/** Same limits as the NNS dapp (`HARDWARE_WALLET_NAME_MIN_LENGTH`, backend max). */
export const LEDGER_DEVICE_NAME_MIN_LENGTH = 2;
export const LEDGER_DEVICE_NAME_MAX_LENGTH = 24;

enum Step {
  Connect = 'connect',
  Name = 'name',
}

type Props = {
  trigger: (open: () => void) => ReactNode;
};

/**
 * Registers a Ledger device in the NNS dapp in three steps: connect the device, name it,
 * register it. The register step runs in the shared `MutationDialog` phases.
 */
export const AddLedgerDeviceDialog = ({ trigger }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(Step.Connect);
  const [identity, setIdentity] = useState<LedgerIdentity>();
  const [name, setName] = useState('');
  const connect = useConnectLedgerDevice();
  const register = useRegisterHardwareWallet();

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= LEDGER_DEVICE_NAME_MIN_LENGTH &&
    trimmedName.length <= LEDGER_DEVICE_NAME_MAX_LENGTH;

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(Step.Connect);
      setIdentity(undefined);
      setName('');
    }
  }, [open]);

  const handleConnect = () => connect.mutate(undefined, { onSuccess: setIdentity });

  const handleSubmit = (execute: (fn: () => Promise<unknown>) => void) => (e: FormEvent) => {
    e.preventDefault();
    if (!isNameValid || !identity) return;
    const principal = identity.getPrincipal();
    execute(() => register.mutateAsync({ name: trimmedName, principal }));
  };

  return (
    <>
      {trigger(() => setOpen(true))}
      <MutationDialog
        open={open}
        onOpenChange={setOpen}
        processingMessage={t(($) => $.userAccount.ledgerDevices.addDialog.registering, {
          name: trimmedName,
        })}
        successMessage={t(($) => $.userAccount.ledgerDevices.addDialog.success, {
          name: trimmedName,
        })}
        navBlockerDescription={t(($) => $.userAccount.ledgerDevices.addDialog.registering, {
          name: trimmedName,
        })}
        errorFallbackMessage={t(($) => $.userAccount.ledgerDevices.addDialog.error)}
        data-testid="add-ledger-device-dialog"
      >
        {({ execute, close }) =>
          step === Step.Connect ? (
            <ConnectStep
              identity={identity}
              isConnecting={connect.isPending}
              onConnect={handleConnect}
              onNext={() => setStep(Step.Name)}
              onCancel={close}
            />
          ) : (
            <form onSubmit={handleSubmit(execute)} className="flex min-h-0 flex-1 flex-col">
              <MutationDialogHeader>
                <ResponsiveDialogTitle>
                  {t(($) => $.userAccount.ledgerDevices.addDialog.nameTitle)}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t(($) => $.userAccount.ledgerDevices.addDialog.nameDescription)}
                </ResponsiveDialogDescription>
              </MutationDialogHeader>

              <MutationDialogBody className="space-y-2 px-4 py-4 md:px-0">
                <Label htmlFor="ledger-device-name">
                  {t(($) => $.userAccount.ledgerDevices.addDialog.nameLabel)}
                </Label>
                <Input
                  id="ledger-device-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={LEDGER_DEVICE_NAME_MIN_LENGTH}
                  maxLength={LEDGER_DEVICE_NAME_MAX_LENGTH}
                  autoFocus
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t(($) => $.userAccount.ledgerDevices.addDialog.nameHint, {
                    min: LEDGER_DEVICE_NAME_MIN_LENGTH,
                    max: LEDGER_DEVICE_NAME_MAX_LENGTH,
                  })}
                </p>
              </MutationDialogBody>

              <MutationDialogFooter className="md:justify-end">
                <Button type="button" variant="ghost" onClick={() => setStep(Step.Connect)}>
                  {t(($) => $.common.back)}
                </Button>
                <Button type="submit" disabled={!isNameValid}>
                  {t(($) => $.userAccount.ledgerDevices.addDialog.register)}
                </Button>
              </MutationDialogFooter>
            </form>
          )
        }
      </MutationDialog>
    </>
  );
};

type ConnectStepProps = {
  identity?: LedgerIdentity;
  isConnecting: boolean;
  onConnect: () => void;
  onNext: () => void;
  onCancel: () => void;
};

const ConnectStep = ({ identity, isConnecting, onConnect, onNext, onCancel }: ConnectStepProps) => {
  const { t } = useTranslation();
  const principal = identity?.getPrincipal();
  const accountIdentifier = principal
    ? AccountIdentifier.fromPrincipal({ principal }).toHex()
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MutationDialogHeader>
        <ResponsiveDialogTitle>
          {t(($) => $.userAccount.ledgerDevices.addDialog.title)}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {principal
            ? t(($) => $.userAccount.ledgerDevices.addDialog.connectedDescription)
            : t(($) => $.userAccount.ledgerDevices.addDialog.connectDescription)}
        </ResponsiveDialogDescription>
      </MutationDialogHeader>

      <MutationDialogBody className="px-4 py-4 md:px-0">
        {principal ? (
          <div className="flex flex-col gap-3" data-testid="ledger-device-details">
            <Badge className="border-transparent bg-green-600/10 text-green-700 dark:text-green-400">
              <Check aria-hidden="true" />
              {t(($) => $.userAccount.ledgerDevices.addDialog.connected)}
            </Badge>
            <div>
              <p className="text-xs text-muted-foreground">
                {t(($) => $.userAccount.ledgerDevices.addDialog.principal)}
              </p>
              <p className="font-mono text-sm break-all">{principal.toText()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t(($) => $.userAccount.ledgerDevices.addDialog.accountIdentifier)}
              </p>
              <p className="font-mono text-sm break-all">{accountIdentifier}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Usb className="size-8 text-primary" aria-hidden="true" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t(($) => $.userAccount.ledgerDevices.addDialog.connectHint)}
            </p>
          </div>
        )}
      </MutationDialogBody>

      <MutationDialogFooter className="md:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t(($) => $.common.cancel)}
        </Button>
        {principal ? (
          <Button type="button" onClick={onNext}>
            {t(($) => $.common.next)}
          </Button>
        ) : (
          <Button type="button" onClick={onConnect} disabled={isConnecting}>
            {isConnecting && <Spinner />}
            {isConnecting
              ? t(($) => $.userAccount.ledgerDevices.addDialog.connecting)
              : t(($) => $.userAccount.ledgerDevices.addDialog.connect)}
          </Button>
        )}
      </MutationDialogFooter>
    </div>
  );
};
