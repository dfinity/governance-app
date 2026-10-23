import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Check, Key, Usb } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DeviceApprovalDialog } from '@features/ledger/components/DeviceApprovalDialog';
import { NeuronStateBadge } from '@features/stakes/components/NeuronStateBadge';
import { useAddHotkey } from '@features/stakes/hooks/useAddHotkey';
import {
  useLedgerDeviceNeurons,
  useUpdateLedgerDeviceNeuron,
} from '@features/stakes/hooks/useLedgerDeviceNeurons';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { SensitiveValue } from '@components/SensitiveValue';
import { Spinner } from '@components/Spinner';
import { E8Sn } from '@constants/extra';
import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { bigIntDiv } from '@utils/bigInt';
import { mapCanisterError } from '@utils/errors';
import {
  formatDissolveDelay,
  getDissolvingTimeInSeconds,
  getLockedTimeInSeconds,
  getNeuronIsDissolved,
  getNeuronIsDissolving,
  getNeuronStakeAfterFeesE8s,
  shortenNeuronId,
} from '@utils/neuron';
import { errorNotification, successNotification } from '@utils/notification';
import { formatNumber } from '@utils/numbers';

import type { Account } from '../types';

type Props = {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Lists the neurons that a Ledger device controls and adds this app as a hotkey to them.
 *
 * The device signs `list_neurons` when the dialog opens, and `AddHotkey` once per neuron.
 * A neuron with the Internet Identity principal as hotkey shows in the normal neurons list.
 */
export const LedgerNeuronsDialog = ({ account, open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const principal = account.principal ?? '';
  const neuronsQuery = useLedgerDeviceNeurons({ principal, enabled: open });

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col focus:outline-none md:max-w-md"
        data-testid="ledger-neurons-dialog"
      >
        <ResponsiveDialogHeader className="shrink-0">
          <ResponsiveDialogTitle>{t(($) => $.accounts.ledgerNeurons.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(($) => $.accounts.ledgerNeurons.description, { name: account.name })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
          {neuronsQuery.isPending && (
            <StateMessage
              icon={<Spinner className="size-8 text-primary" />}
              message={t(($) => $.accounts.ledgerNeurons.connecting)}
              dataTestId="ledger-neurons-connecting"
            />
          )}

          {neuronsQuery.isError && (
            <StateMessage
              icon={<AlertTriangle className="size-8 text-destructive" aria-hidden="true" />}
              message={mapCanisterError(neuronsQuery.error)}
              dataTestId="ledger-neurons-error"
            >
              <div className="flex w-full gap-3 pt-2">
                <Button
                  variant="outline"
                  size="xl"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {t(($) => $.common.close)}
                </Button>
                <Button size="xl" className="flex-1" onClick={() => neuronsQuery.refetch()}>
                  {t(($) => $.common.retry)}
                </Button>
              </div>
            </StateMessage>
          )}

          {neuronsQuery.isSuccess && neuronsQuery.data.length === 0 && (
            <StateMessage
              icon={<Usb className="size-8 text-muted-foreground" aria-hidden="true" />}
              message={t(($) => $.accounts.ledgerNeurons.empty)}
              dataTestId="ledger-neurons-empty"
            />
          )}

          {neuronsQuery.isSuccess && neuronsQuery.data.length > 0 && (
            <ul className="flex flex-col" data-testid="ledger-neurons-list">
              {neuronsQuery.data.map((neuron) => (
                <LedgerNeuronRow
                  key={String(neuron.neuronId)}
                  neuron={neuron}
                  principal={principal}
                />
              ))}
            </ul>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

function StateMessage({
  icon,
  message,
  dataTestId,
  children,
}: {
  icon: React.ReactNode;
  message: string;
  dataTestId: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center"
      data-testid={dataTestId}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <p className="max-w-xs text-sm font-medium wrap-anywhere text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}

function LedgerNeuronRow({ neuron, principal }: { neuron: NeuronInfo; principal: string }) {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const addHotkey = useAddHotkey();
  const updateNeuron = useUpdateLedgerDeviceNeuron(principal);
  const [isApproving, setIsApproving] = useState(false);

  const iiPrincipal = identity?.getPrincipal().toText();
  const hasHotkey = !!iiPrincipal && (neuron.fullNeuron?.hotKeys.includes(iiPrincipal) ?? false);

  const isDissolved = getNeuronIsDissolved(neuron);
  const isDissolving = getNeuronIsDissolving(neuron);
  const dissolveDelaySeconds = isDissolving
    ? getDissolvingTimeInSeconds(neuron)
    : getLockedTimeInSeconds(neuron);
  const durationText = formatDissolveDelay({
    seconds: dissolveDelaySeconds || 0n,
    i18n: t(($) => $.common.durationUnits, { returnObjects: true }),
  });
  const stake = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);
  const neuronIdText = shortenNeuronId(neuron.neuronId);

  const handleAddHotkey = async () => {
    if (!iiPrincipal) return;
    setIsApproving(true);

    try {
      await addHotkey.mutateAsync({
        neuronId: neuron.neuronId,
        principal: iiPrincipal,
        signer: { kind: 'ledger', principal },
      });
      updateNeuron(neuron.neuronId, (cached) =>
        cached.fullNeuron
          ? {
              ...cached,
              fullNeuron: {
                ...cached.fullNeuron,
                hotKeys: [...cached.fullNeuron.hotKeys, iiPrincipal],
              },
            }
          : cached,
      );
      successNotification({
        title: t(($) => $.accounts.ledgerNeurons.hotkeyAddedTitle),
        description: t(($) => $.accounts.ledgerNeurons.hotkeyAddedDescription, {
          neuronId: neuronIdText,
        }),
      });
    } catch (error) {
      errorNotification({
        title: t(($) => $.accounts.ledgerNeurons.hotkeyFailedTitle),
        description: error instanceof Error ? mapCanisterError(error) : undefined,
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <li
      className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-b-0"
      data-testid="ledger-neuron-row"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[15px] font-semibold">
          {t(($) => $.neuron.neuronId, { neuronId: neuronIdText })}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <SensitiveValue size="sm">
            {t(($) => $.common.inIcp, { value: formatNumber(stake) })}
          </SensitiveValue>
          <NeuronStateBadge isDissolved={isDissolved} isDissolving={isDissolving} />
          <span>{durationText}</span>
        </div>
      </div>

      {hasHotkey ? (
        <span
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400"
          data-testid="ledger-neuron-hotkey-added"
        >
          <Check className="size-4" aria-hidden="true" />
          {t(($) => $.accounts.ledgerNeurons.hotkeyAdded)}
        </span>
      ) : (
        <Button
          size="sm"
          className="shrink-0"
          onClick={handleAddHotkey}
          disabled={isApproving || !iiPrincipal}
          data-testid="ledger-neuron-add-hotkey"
        >
          {isApproving ? <Spinner /> : <Key aria-hidden="true" />}
          {t(($) => $.accounts.ledgerNeurons.addHotkey)}
        </Button>
      )}

      <DeviceApprovalDialog
        open={isApproving}
        description={t(($) => $.accounts.ledgerNeurons.approveDescription)}
        onCancel={() => setIsApproving(false)}
      />
    </li>
  );
}
