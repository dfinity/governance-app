import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, BookUser, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { useMainAccountMetadata } from '@features/accounts/hooks/useMainAccountMetadata';
import {
  DestinationInput,
  type DestinationSuggestion,
} from '@features/addressBook/components/DestinationInput';

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
import { ResponsiveDialogTitle } from '@components/ResponsiveDialog';
import { E8Sn, ICP_MIN_DISBURSE_MATURITY_AMOUNT } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { addressToAccountIdentifier, isValidIcpAddress, isValidIcrcAddress } from '@utils/address';
import { addressBookGetAddressString, addressBookIsIcpAddress } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';
import { cn } from '@utils/shadcn';

import {
  type DisburseMaturityDestination,
  useDisburseMaturity,
} from '../hooks/useDisburseMaturity';
import { useNeuronSigner } from '../hooks/useNeuronSigner';

const PRESET_PERCENTAGES = [25, 50, 75, 100] as const;
const DEFAULT_PERCENTAGE = 100;

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseMaturityModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useDisburseMaturity();
  const signer = useNeuronSigner(neuron);
  const { features } = useAdvancedFeatures();
  const subaccountsEnabled = features.subaccounts;
  const [validationError, setValidationError] = useState<string | null>(null);
  // The destination field is marked invalid only for its own errors, not for an amount error.
  const [destinationInvalid, setDestinationInvalid] = useState(false);

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

  // Disburse the whole balance by default so the common case stays a single click. The raw
  // input string is the source of truth so the field can be cleared; percentage is derived.
  const [percentageInput, setPercentageInput] = useState(String(DEFAULT_PERCENTAGE));

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setDestinationInvalid(false);
    setDestination(mainAccountId);
    setDestinationName(mainAccountName);
    setPercentageInput(String(DEFAULT_PERCENTAGE));
  }, [isOpen, mainAccountId, mainAccountName]);

  // Clamp to a valid 0-100 integer for all downstream math and validation.
  const percentage = Math.min(100, Math.max(0, Math.floor(Number(percentageInput) || 0)));

  const freeMaturityE8s = neuron ? getNeuronFreeMaturityE8s(neuron) : 0n;
  const availableMaturity = bigIntDiv(freeMaturityE8s, E8Sn);
  // Compute the portion in e8s to avoid rounding drift, then convert once for display.
  const selectedMaturityE8s = (freeMaturityE8s * BigInt(percentage)) / 100n;
  const selectedMaturity = bigIntDiv(selectedMaturityE8s, E8Sn);

  // "Your balance" only holds for the main account. Any other destination is
  // "the selected account".
  const isToSelectedAccount = addressToAccountIdentifier(destination.trim()) !== mainAccountId;

  const handlePercentageChange = (value: string) => {
    setValidationError(null);
    setDestinationInvalid(false);
    // Digits only, so an empty field stays empty and "0" stays "0" instead of clearing.
    if (!/^\d*$/.test(value)) return;
    // Clamp values above the max, but let everything else through as typed.
    setPercentageInput(value !== '' && Number(value) > 100 ? '100' : value);
  };

  const handleConfirm = (execute: (fn: () => Promise<unknown>) => void) => {
    if (!neuron) return;
    if (selectedMaturity < ICP_MIN_DISBURSE_MATURITY_AMOUNT) {
      setValidationError(
        t(($) => $.neuronDetailModal.disburseMaturity.errors.amountTooLow, {
          min: ICP_MIN_DISBURSE_MATURITY_AMOUNT,
        }),
      );
      return;
    }

    const address = destination.trim();
    if (address === '') {
      setValidationError(t(($) => $.neuronDetailModal.disburseMaturity.errors.noDestination));
      setDestinationInvalid(true);
      return;
    }

    let target: DisburseMaturityDestination;
    if (isValidIcpAddress(address)) {
      target = { kind: 'icp', accountIdentifier: address };
    } else if (isValidIcrcAddress(address)) {
      const { owner, subaccount } = decodeIcrcAccount(address);
      target = { kind: 'icrc1', owner, subaccount };
    } else {
      setValidationError(t(($) => $.neuronDetailModal.disburseMaturity.errors.invalidDestination));
      setDestinationInvalid(true);
      return;
    }

    execute(() =>
      mutateAsync({
        neuronId: neuron.neuronId,
        destination: target,
        percentageToDisburse: percentage,
        signer,
      }),
    );
  };

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.neuronDetailModal.disburseMaturity.confirming)}
      successMessage={t(($) =>
        isToSelectedAccount
          ? $.neuronDetailModal.disburseMaturity.successToAccount
          : $.neuronDetailModal.disburseMaturity.success,
      )}
      navBlockerDescription={t(($) => $.neuronDetailModal.confirmNavigation)}
      data-testid="disburse-maturity-modal"
    >
      {({ execute, close }) => (
        <>
          <MutationDialogHeader>
            <ResponsiveDialogTitle>
              {t(($) => $.neuronDetailModal.disburseMaturity.title)}
            </ResponsiveDialogTitle>
          </MutationDialogHeader>

          <MutationDialogBody className="mt-4 flex flex-col gap-4 px-4 md:px-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="disburse-maturity-to-account">
                  {t(($) => $.neuronDetailModal.disburseMaturity.toAccount)}
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
                id="disburse-maturity-to-account"
                data-testid="disburse-maturity-destination-input"
                value={destination}
                selectedName={destinationName}
                suggestions={destinationSuggestions}
                onChange={(value, name) => {
                  setDestination(value);
                  setDestinationName(name);
                  setValidationError(null);
                  setDestinationInvalid(false);
                }}
                placeholder={t(($) => $.addressBook.destination.placeholderWithAccounts)}
                invalid={destinationInvalid}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="disburse-maturity-percentage">
                  {t(($) => $.neuronDetailModal.disburseMaturity.portion)}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {t(($) => $.neuronDetailModal.disburseMaturity.available, {
                    amount: formatNumber(availableMaturity),
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                {PRESET_PERCENTAGES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPercentageInput(String(preset));
                      setValidationError(null);
                      setDestinationInvalid(false);
                    }}
                    aria-pressed={percentage === preset}
                    data-testid={`disburse-maturity-preset-${preset}`}
                    className={cn(
                      'flex-1 rounded-md border-2 py-1.5 text-sm font-medium transition-colors',
                      percentage === preset
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  id="disburse-maturity-percentage"
                  type="text"
                  inputMode="numeric"
                  value={percentageInput}
                  onChange={(e) => handlePercentageChange(e.target.value)}
                  aria-label={t(($) => $.neuronDetailModal.disburseMaturity.percentageAria)}
                  className="pr-9"
                  data-testid="disburse-maturity-percentage-input"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <Trans
                  i18nKey={($) =>
                    isToSelectedAccount
                      ? $.neuronDetailModal.disburseMaturity.infoToAccount
                      : $.neuronDetailModal.disburseMaturity.info
                  }
                  t={t}
                  values={{ amount: formatNumber(selectedMaturity) }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>

            {validationError && (
              <Alert variant="warning" data-testid="disburse-maturity-amount-error">
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
              {t(($) => $.neuronDetailModal.disburseMaturity.cancel)}
            </Button>
            <Button
              size="xl"
              className="md:flex-1"
              disabled={addressBookLoading}
              onClick={() => handleConfirm(execute)}
            >
              {t(($) => $.neuronDetailModal.disburseMaturity.confirm)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
