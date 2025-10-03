import { Agent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { AccountIdentifier, BlockHeight, E8s, LedgerCanister } from '@dfinity/ledger-icp';
import { createAgent as createAgentUtils } from '@dfinity/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Input,
  Modal,
  ModalOverlay,
} from '@untitledui/components';

import { E8Sn, IS_TESTNET, NETWORK } from '@constants/extra';
import { withMinimumDelay } from '@utils/async';
import { QUERY_KEYS } from '@utils/query';

const assertTestnet = () => {
  if (!IS_TESTNET) throw new Error('The environment is not "testnet"');
};

const base64ToUInt8Array = (base64String: string): Uint8Array => {
  return Uint8Array.from(window.atob(base64String), (c) => c.charCodeAt(0));
};

// Reference: https://github.com/dfinity/nns-dapp/blob/1575e2957cf611666ded606a522b301c7b534a4e/frontend/src/lib/api/dev.api.ts#L34
const getTestAccountAgent = async (): Promise<Agent> => {
  const publicKey = 'Uu8wv55BKmk9ZErr6OIt5XR1kpEGXcOSOC1OYzrAwuk=';
  const privateKey =
    'N3HB8Hh2PrWqhWH2Qqgr1vbU9T3gb1zgdBD8ZOdlQnVS7zC/nkEqaT1kSuvo4i3ldHWSkQZdw5I4LU5jOsDC6Q==';
  const identity = Ed25519KeyIdentity.fromKeyPair(
    base64ToUInt8Array(publicKey),
    base64ToUInt8Array(privateKey),
  );

  return await createAgentUtils({
    host: NETWORK,
    identity,
    fetchRootKey: true,
  });
};

// NOTE: This doesn't work check on ic-js
// AccountIdentifier.fromHex(string);

/*
 * Gives the caller the specified amount of (fake) ICPs.
 * Should/can only be used on testnets.
 */
const acquireICPTs = async ({
  accountId,
  e8s,
}: {
  accountId: AccountIdentifier;
  e8s: E8s;
}): Promise<BlockHeight> => {
  assertTestnet();

  try {
    const agent = await getTestAccountAgent();
    const ledgerCanister: LedgerCanister = LedgerCanister.create({ agent });

    const promise = ledgerCanister.transfer({
      amount: e8s,
      to: accountId,
    });

    // The new transaction block takes a bit of time to propagate so we intentionally make the call slower
    return await withMinimumDelay(promise, 2000);
  } catch (error) {
    throw new Error(
      `Failed to transfer tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const GetTokens = (props: { accountId: AccountIdentifier }) => {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const { accountId } = props;

  const acquireTokensMutation = useMutation<
    BlockHeight,
    Error,
    { accountId: AccountIdentifier; e8s: E8s }
  >({
    mutationKey: ['acquireICPTs'],
    mutationFn: acquireICPTs,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      setValue('');
    },
    onError: (error) => {
      console.error('Failed to acquire tokens:', error);
    },
  });

  const handleSubmit = (close: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = parseFloat(value);
    if (amount <= 0 || isNaN(amount)) {
      console.error('Invalid amount');
      return;
    }

    const e8s = BigInt(Math.floor(amount * Number(E8Sn)));
    acquireTokensMutation.mutateAsync({ e8s, accountId }).then(close);
  };

  return (
    <DialogTrigger>
      <Button color="tertiary" size="sm">
        Get Tokens
      </Button>
      <ModalOverlay isDismissable>
        <Modal className="max-w-xl rounded-2xl bg-primary p-6 shadow-lg">
          <Dialog>
            {({ close }) => (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(close)}>
                <Heading slot="title" className="text-md font-semibold text-primary">
                  Get Testnet ICPs
                </Heading>
                <p className="text-sm text-tertiary">Account: {accountId.toHex()}</p>
                <div className="flex items-end gap-1">
                  <Input type="number" size="sm" label="Amount" value={value} onChange={setValue} />
                  <Button
                    type="submit"
                    color="primary"
                    size="sm"
                    isLoading={acquireTokensMutation.isPending}
                  >
                    Top Up
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
};
