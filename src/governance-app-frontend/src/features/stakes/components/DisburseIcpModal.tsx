import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, BookUser, Info } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { useMainAccountMetadata } from '@features/accounts/hooks/useMainAccountMetadata';
import {
  DestinationInput,
  type DestinationSuggestion,
} from '@features/addressBook/components/DestinationInput';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import { Label } from '@components/Label';
import {
  MutationDialog,
  MutationDialogBody,
  MutationDialogFooter,
  MutationDialogHeader,
} from '@components/MutationDialog';
import { ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { E8Sn } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { addressToAccountIdentifier } from '@utils/address';
import { addressBookGetAddressString, addressBookIsIcpAddress } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronStakeAfterFeesE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useDisburseNeuron } from '../hooks/useDisburseNeuron';
import { useNeuronSigner } from '../hooks/useNeuronSigner';

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseIcpModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useDisburseNeuron();
  const signer = useNeuronSigner(neuron);
  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;
  const [validationError, setValidationError] = useState<string | null>(null);

  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const addressBookLoading = addressBookQuery.isLoading;

  // The accounts come from the identity, so the main account is known at once.
  const mainAccountId = useMainAccountMetadata().data!.accountId;
  const mainAccountName = t(($) => $.accounts.mainAccount);
  const { data: accountsState } = useAccounts();
  const ownAccounts = (accountsState?.accounts ?? []).filter(
    (account) => subaccountsEnabled || account.accountId === mainAccountId,
  );
  const destinationSuggestions: DestinationSuggestion[] = [
    ...ownAccounts.map((account) => ({
      name: account.name,
      address: account.accountId,
      kind: 'account' as const,
    })),
    ...addressBookEntries.map((entry) => ({
      name: entry.name,
      address: addressBookGetAddressString(entry.address),
      kind: addressBookIsIcpAddress(entry.address) ? ('icp' as const) : ('icrc1' as const),
    })),
  ];

  // The main account is the default destination.
  const [destination, setDestination] = useState('');
  const [destinationName, setDestinationName] = useState('');

  const resetDestination = useEffectEvent(() => {
    setValidationError(null);
    setDestination(mainAccountId);
    setDestinationName(mainAccountName);
  });

  useEffect(() => {
    if (isOpen) resetDestination();
  }, [isOpen]);

  const stakedAmount = neuron ? bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn) : 0;
  // The governance canister disburses to an account identifier only, so an
  // ICRC-1 destination maps to the identifier the ICP ledger derives for it.
  const toAccountId = addressToAccountIdentifier(destination.trim());
  // "Your balance" only holds for the main account. Any other destination is
  // "the selected account".
  const isToSelectedAccount = toAccountId !== mainAccountId;

  const handleConfirm = (execute: (fn: () => Promise<unknown>) => void) => {
    if (!neuron) return;

    const address = destination.trim();
    if (address === '') {
      setValidationError(t(($) => $.neuronDetailModal.disburseIcp.errors.noDestination));
      return;
    }
    if (toAccountId === undefined) {
      setValidationError(t(($) => $.neuronDetailModal.disburseIcp.errors.invalidDestination));
      return;
    }

    execute(() => mutateAsync({ neuronId: neuron.neuronId, toAccountId, signer }));
  };

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.neuronDetailModal.disburseIcp.confirming)}
      successMessage={t(($) =>
        isToSelectedAccount
          ? $.neuronDetailModal.disburseIcp.successToAccount
          : $.neuronDetailModal.disburseIcp.success,
      )}
      navBlockerDescription={t(($) => $.neuronDetailModal.confirmNavigation)}
      data-testid="disburse-icp-modal"
    >
      {({ execute, close }) => (
        <>
          <MutationDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.neuronDetailModal.disburseIcp.title)}
            </ResponsiveDialogTitle>
          </MutationDialogHeader>

          <MutationDialogBody className="mt-4 flex flex-col gap-4 px-4 md:px-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="disburse-icp-to-account">
                  {t(($) => $.neuronDetailModal.disburseIcp.toAccount)}
                </Label>
                {addressBookLoading && (
                  <div className="flex items-center gap-1.5">
                    <BookUser className="size-3.5 animate-pulse text-muted-foreground" />
                    <span className="animate-pulse text-xs text-muted-foreground">
                      {t(($) => $.addressBook.sendFlow.tooltipLoading)}
                    </span>
                  </div>
                )}
              </div>

              <DestinationInput
                id="disburse-icp-to-account"
                data-testid="disburse-icp-destination-input"
                value={destination}
                selectedName={destinationName}
                suggestions={destinationSuggestions}
                onChange={(value, name) => {
                  setDestination(value);
                  setDestinationName(name);
                  setValidationError(null);
                }}
                placeholder={t(($) => $.addressBook.destination.placeholderWithAccounts)}
                invalid={validationError !== null}
              />
            </div>

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <Trans
                  i18nKey={($) =>
                    isToSelectedAccount
                      ? $.neuronDetailModal.disburseIcp.infoToAccount
                      : $.neuronDetailModal.disburseIcp.info
                  }
                  t={t}
                  values={{ amount: formatNumber(stakedAmount) }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>

            {validationError && (
              <Alert variant="warning" data-testid="disburse-icp-destination-error">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </MutationDialogBody>

          <MutationDialogFooter>
            <Button
              variant="outline"
              size="xl"
              className="transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0 md:flex-1"
              onClick={close}
            >
              {t(($) => $.neuronDetailModal.disburseIcp.cancel)}
            </Button>
            <Button size="xl" className="md:flex-1" onClick={() => handleConfirm(execute)}>
              {t(($) => $.neuronDetailModal.disburseIcp.confirm)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
