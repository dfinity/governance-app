import { nonNullish } from '@dfinity/utils';
import { BookUser, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AddressBook,
  NamedAddress,
} from '@declarations/governance-app-backend/governance-app-backend.did';

import { SendICPDialog } from '@features/account/components/SendICPButton';
import { useAccounts } from '@features/accounts/hooks/useAccounts';
import { isAccountReady } from '@features/accounts/types';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { Button } from '@components/button';
import { QueryStates } from '@components/QueryStates';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { SkeletonAddressBookRows } from '@components/skeletons/SkeletonListRows';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { ADDRESS_BOOK_MAX_ENTRIES } from '@constants/addressBook';
import { E8Sn, ICP_TRANSACTION_FEE } from '@constants/extra';
import { useAddressBook } from '@hooks/addressBook/useAddressBook';
import { useIcpLedger } from '@hooks/icpLedger/useIcpLedger';
import type { CertifiedData } from '@typings/queries';
import { addressBookGetAddressString } from '@utils/addressBook';
import { bigIntDiv } from '@utils/bigInt';

import { AddAddressModal } from './AddAddressModal';
import { AddressBookEntry } from './AddressBookEntry';
import { RemoveAddressConfirmation } from './RemoveAddressConfirmation';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AddressBookModal: React.FC<Props> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const addressBookQuery = useAddressBook();

  const [editingAddress, setEditingAddress] = useState<NamedAddress | undefined>();
  const [deletingAddress, setDeletingAddress] = useState<NamedAddress | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingTo, setSendingTo] = useState<NamedAddress | undefined>();

  // The send dialog sends from the main account. The send action shows only
  // once the balance is known and the ledger can transfer, as for the send button.
  const { data: accountsState } = useAccounts();
  const { ready: ledgerReady, authenticated: ledgerAuthenticated } = useIcpLedger();
  const mainAccount = accountsState?.accounts.find(
    (account) => account.accountId === accountsState.mainAccountId,
  );
  const mainBalance =
    nonNullish(mainAccount) && isAccountReady(mainAccount)
      ? bigIntDiv(mainAccount.balanceE8s, E8Sn)
      : undefined;
  const canSend =
    nonNullish(mainBalance) &&
    mainBalance > ICP_TRANSACTION_FEE &&
    ledgerReady &&
    ledgerAuthenticated;

  const handleEdit = (namedAddress: NamedAddress) => {
    setEditingAddress(namedAddress);
    setShowAddModal(true);
  };

  const handleDelete = (namedAddress: NamedAddress) => {
    setDeletingAddress(namedAddress);
  };

  const handleAdd = () => {
    setEditingAddress(undefined);
    setShowAddModal(true);
  };

  const addButton = (disabled: boolean) => (
    <Button onClick={handleAdd} disabled={disabled} data-testid="address-book-add-btn" size="sm">
      <Plus className="size-4" />
      {t(($) => $.addressBook.addAddress)}
    </Button>
  );

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          className="flex max-h-[90vh] flex-col"
          data-testid="address-book-modal"
        >
          <ResponsiveDialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <ResponsiveDialogTitle>{t(($) => $.addressBook.title)}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="sr-only">
                {t(($) => $.addressBook.description)}
              </ResponsiveDialogDescription>
            </div>
          </ResponsiveDialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0">
            <QueryStates<CertifiedData<AddressBook>>
              query={addressBookQuery}
              isEmpty={(data) => data.response.named_addresses.length === 0}
              loadingComponent={<SkeletonAddressBookRows />}
              emptyComponent={
                <div
                  className="flex flex-col items-center gap-5 py-12 text-center"
                  data-testid="address-book-empty"
                >
                  <div className="rounded-full bg-muted p-4">
                    <BookUser className="size-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="max-w-md font-medium">{t(($) => $.addressBook.emptyTitle)}</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      {t(($) => $.addressBook.emptyDescription)}
                    </p>
                  </div>
                  {addButton(false)}
                </div>
              }
            >
              {(data) => {
                const namedAddresses = data.response.named_addresses;
                const isMaxReached = namedAddresses.length >= ADDRESS_BOOK_MAX_ENTRIES;

                return (
                  <>
                    <div className="flex shrink-0 items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t(($) => $.addressBook.entryCount, {
                          count: namedAddresses.length,
                          max: ADDRESS_BOOK_MAX_ENTRIES,
                        })}
                      </p>
                      {isMaxReached ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{addButton(true)}</TooltipTrigger>
                          <TooltipContent>{t(($) => $.addressBook.maxReached)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        addButton(false)
                      )}
                    </div>
                    <div className="flex flex-col gap-2" data-testid="address-book-list">
                      {namedAddresses.map((entry) => (
                        <AddressBookEntry
                          key={entry.name}
                          namedAddress={entry}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onSend={
                            canSend
                              ? (entry) => {
                                  analytics.event(AnalyticsEvent.AccountOpenSend, {
                                    variant: 'contact',
                                  });
                                  setSendingTo(entry);
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </>
                );
              }}
            </QueryStates>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <AddAddressModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingAddress(undefined);
        }}
        namedAddress={editingAddress}
        existingAddresses={addressBookQuery.data?.response?.named_addresses ?? []}
      />

      <SendICPDialog
        open={nonNullish(sendingTo)}
        onOpenChange={(open) => {
          if (!open) setSendingTo(undefined);
        }}
        balance={mainBalance ?? 0}
        variant="contact"
        initialDestination={
          nonNullish(sendingTo)
            ? { name: sendingTo.name, address: addressBookGetAddressString(sendingTo.address) }
            : undefined
        }
      />

      <RemoveAddressConfirmation
        isOpen={!!deletingAddress}
        onClose={() => setDeletingAddress(undefined)}
        namedAddress={deletingAddress}
        existingAddresses={addressBookQuery.data?.response?.named_addresses ?? []}
      />
    </>
  );
};
