import { decodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, BookUser, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { useAccountSelection } from '@features/accounts/hooks/useAccountSelection';
import { isAccountReady } from '@features/accounts/types';
import { AddressBookSelect } from '@features/addressBook/components/AddressBookSelect';

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
import { Switch } from '@components/Switch';
import { E8Sn, ICP_MIN_DISBURSE_MATURITY_AMOUNT } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import {
  type DisburseMaturityDestination,
  useDisburseMaturity,
} from '../hooks/useDisburseMaturity';

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseMaturityModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useDisburseMaturity();
  const { selectedAccountId, setSelectedAccountId, resolvedAccountId, subaccountsEnabled } =
    useAccountSelection();
  const [validationError, setValidationError] = useState<string | null>(null);

  const addressBookQuery = useAddressBook();
  const addressBookEntries = addressBookQuery.data?.response?.named_addresses ?? [];
  const addressBookLoading = addressBookQuery.isLoading;
  const hasAddresses = addressBookEntries.length > 0;

  // Without subaccounts there is no account picker, so surface the fixed main-account
  // destination as a read-only field instead of leaving the section blank.
  const { data: accountsState } = useAccounts();
  const mainAccount = accountsState?.accounts.find(
    (a) => a.accountId === accountsState.mainAccountId,
  );
  const mainAccountLabel = mainAccount
    ? `${mainAccount.name}${
        isAccountReady(mainAccount)
          ? ` — ${formatNumber(bigIntDiv(mainAccount.balanceE8s, E8Sn))} ICP`
          : ''
      }`
    : t(($) => $.accounts.mainAccount);

  // Default to the account picker as the primary action; the address book is opt-in.
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(false);
  const [selectedAddressBookName, setSelectedAddressBookName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationError(null);
    setSelectedAddressBookName('');
    setUseAddressBookToggle(false);
  }, [isOpen]);

  const unstakedMaturity = neuron ? bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn) : 0;

  const handleConfirm = (execute: (fn: () => Promise<unknown>) => void) => {
    if (!neuron) return;
    if (unstakedMaturity < ICP_MIN_DISBURSE_MATURITY_AMOUNT) {
      setValidationError(
        t(($) => $.neuronDetailModal.disburseMaturity.errors.amountTooLow, {
          min: ICP_MIN_DISBURSE_MATURITY_AMOUNT,
        }),
      );
      return;
    }

    let destination: DisburseMaturityDestination;
    if (useAddressBookToggle) {
      const entry = addressBookEntries.find((e) => e.name === selectedAddressBookName);
      if (!entry) {
        setValidationError(t(($) => $.neuronDetailModal.disburseMaturity.errors.noDestination));
        return;
      }
      if ('Icp' in entry.address) {
        destination = { kind: 'icp', accountIdentifier: entry.address.Icp };
      } else {
        try {
          const { owner, subaccount } = decodeIcrcAccount(entry.address.Icrc1);
          destination = { kind: 'icrc1', owner, subaccount };
        } catch {
          setValidationError(
            t(($) => $.neuronDetailModal.disburseMaturity.errors.invalidDestination),
          );
          return;
        }
      }
    } else {
      destination = { kind: 'icp', accountIdentifier: resolvedAccountId };
    }

    execute(() => mutateAsync({ neuronId: neuron.neuronId, destination }));
  };

  const handleToggleChange = (checked: boolean) => {
    setUseAddressBookToggle(checked);
    setSelectedAddressBookName('');
    setValidationError(null);
  };

  const showDestinationSection = subaccountsEnabled || hasAddresses || addressBookLoading;
  const showToggle = !addressBookLoading && hasAddresses;

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.neuronDetailModal.disburseMaturity.confirming)}
      successMessage={t(($) => $.neuronDetailModal.disburseMaturity.success)}
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
            {showDestinationSection && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={
                      useAddressBookToggle ? 'address-book-select' : 'disburse-maturity-to-account'
                    }
                  >
                    {t(($) => $.neuronDetailModal.disburseMaturity.toAccount)}
                  </Label>
                  {addressBookLoading ? (
                    <div className="flex items-center gap-1.5">
                      <BookUser className="size-3.5 animate-pulse text-muted-foreground" />
                      <span className="animate-pulse text-xs text-muted-foreground">
                        {t(($) => $.addressBook.sendFlow.tooltipLoading)}
                      </span>
                    </div>
                  ) : showToggle ? (
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <BookUser className="size-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {t(($) => $.addressBook.sendFlow.toggleLabel)}
                      </span>
                      <Switch
                        checked={useAddressBookToggle}
                        onCheckedChange={handleToggleChange}
                        size="sm"
                        data-testid="disburse-maturity-address-book-toggle"
                      />
                    </label>
                  ) : !hasAddresses ? (
                    <Link
                      to="/settings"
                      search={{ openAddressBook: true }}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    >
                      <BookUser className="size-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground underline">
                        {t(($) => $.addressBook.sendFlow.tooltipEmpty)}
                      </span>
                    </Link>
                  ) : null}
                </div>

                {useAddressBookToggle ? (
                  <AddressBookSelect
                    addresses={addressBookEntries}
                    selectedName={selectedAddressBookName}
                    onSelect={(name) => {
                      setSelectedAddressBookName(name);
                      setValidationError(null);
                    }}
                  />
                ) : subaccountsEnabled ? (
                  <AccountSelect
                    id="disburse-maturity-to-account"
                    value={selectedAccountId}
                    onChange={setSelectedAccountId}
                    data-testid="disburse-maturity-account-select"
                  />
                ) : (
                  <div
                    id="disburse-maturity-to-account"
                    className="flex h-9 w-full items-center rounded-md border-2 border-input px-3 text-sm text-muted-foreground"
                    data-testid="disburse-maturity-main-account"
                  >
                    {mainAccountLabel}
                  </div>
                )}
              </div>
            )}

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <Trans
                  i18nKey={($) => $.neuronDetailModal.disburseMaturity.info}
                  t={t}
                  values={{ amount: formatNumber(unstakedMaturity) }}
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
