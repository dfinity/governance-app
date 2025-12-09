import { AccountIdentifier, BlockHeight, E8s, LedgerCanister } from '@icp-sdk/canisters/ledger/icp';
import { Agent } from '@icp-sdk/core/agent';
import { useAgentPool } from '@hooks/useAgentPool';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';

import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@ui/responsive-dialog';
import { E8Sn, ICP_TRANSACTION_PROPAGATION_DELAY_MS, IS_TESTNET } from '@constants/extra';
import { withMinimumDelay } from '@utils/async';
import { errorMessage } from '@utils/error';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

/*
 * Gives the caller the specified amount of (fake) ICPs.
 * Should/can only be used on testnets.
 */
const acquireICPs = async ({
  accountId,
  e8s,
  agent,
}: {
  accountId: AccountIdentifier;
  e8s: E8s;
  agent: Agent;
}): Promise<BlockHeight> => {
  if (!IS_TESTNET) throw errorMessage('acquireICPs', 'the environment is not "testnet"');

  try {
    // For this to work it needs the anonymous agent
    // https://github.com/dfinity/ic/blob/21bf0fd88f506d949e07c226335b3896caf2bd52/packages/pocket-ic/src/common/rest.rs#L591
    const ledgerCanister: LedgerCanister = LedgerCanister.create({ agent });

    const promise = ledgerCanister.transfer({
      amount: e8s,
      to: accountId,
    });

    // The new transaction block takes a bit of time to propagate so we intentionally make the call slower
    return await withMinimumDelay(promise, ICP_TRANSACTION_PROPAGATION_DELAY_MS);
  } catch (error) {
    throw new Error(
      `Failed to transfer tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const GetTokens = (props: { accountId: AccountIdentifier }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amountOfIcp, setAmountOfIcp] = useState('');
  const [amountOfIcpError, setAmountOfIcpError] = useState<string | null>(null);
  const { anonymous } = useAgentPool().agentPool;
  const { accountId } = props;

  const acquireTokensMutation = useMutation<
    BlockHeight,
    Error,
    { accountId: AccountIdentifier; e8s: E8s; agent: Agent }
  >({
    mutationFn: acquireICPs,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });

      setAmountOfIcp('');
      successNotification({
        description: `Top-up of ${amountOfIcp} ICPs successful.`,
      });
      setOpen(false);
    },
    onError: (error) => {
      errorNotification({
        description: `Failed to acquire tokens: ${error}.`,
      });
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAmountOfIcpError(null);

    const amount = parseFloat(amountOfIcp);
    if (amount <= 0 || isNaN(amount)) {
      setAmountOfIcpError(`Invalid amount ${amount}. Must be a number greater than 0.`);
      return;
    }

    const e8s = BigInt(Math.floor(amount * Number(E8Sn)));
    acquireTokensMutation.mutateAsync({ e8s, accountId, agent: anonymous.agent! });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button size="sm" variant="outline">
          Get Tokens
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Get Testnet ICPs</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="break-all">
              Account: {accountId.toHex()}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="tokens-amount">Amount</Label>
            <Input
              id="tokens-amount"
              type="number"
              className={amountOfIcpError ? 'border-destructive' : ''}
              value={amountOfIcp}
              onChange={(e) => setAmountOfIcp(e.target.value)}
            />
            {amountOfIcpError && <p className="text-sm text-destructive">{amountOfIcpError}</p>}
          </div>

          <ResponsiveDialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={acquireTokensMutation.isPending}
            >
              {acquireTokensMutation.isPending ? 'Topping Up...' : 'Top Up'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
