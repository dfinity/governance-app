import {
  AccountIdentifier,
  BlockHeight,
  E8s,
  IcpLedgerCanister,
} from '@icp-sdk/canisters/ledger/icp';
import { Agent } from '@icp-sdk/core/agent';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { Button } from '@components/button';
import { Input } from '@components/Input';
import { Label } from '@components/Label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@components/ResponsiveDialog';
import { E8Sn, ICP_TRANSACTION_PROPAGATION_DELAY_MS, IS_TESTNET } from '@constants/extra';
import { useAgentPool } from '@hooks/useAgentPool';
import { withMinimumDelay } from '@utils/async';
import { errorMessage } from '@utils/error';
import { mapCanisterError } from '@utils/errors';
import { errorNotification, successNotification } from '@utils/notification';
import { QUERY_KEYS } from '@utils/query';

/*
 * Gives the caller the specified amount of (fake) ICP.
 * Should/can only be used on testnets.
 */
const acquireICP = async ({
  accountId,
  e8s,
  agent,
}: {
  accountId: AccountIdentifier;
  e8s: E8s;
  agent: Agent;
}): Promise<BlockHeight> => {
  if (!IS_TESTNET) throw errorMessage('acquireICP', 'the environment is not "testnet"');

  try {
    // For this to work it needs the anonymous agent
    // https://github.com/dfinity/ic/blob/21bf0fd88f506d949e07c226335b3896caf2bd52/packages/pocket-ic/src/common/rest.rs#L591
    const ledgerCanister: IcpLedgerCanister = IcpLedgerCanister.create({ agent });

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
    mutationFn: acquireICP,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_INDEX.TRANSACTIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ICP_LEDGER.ACCOUNT_BALANCE],
      });

      setAmountOfIcp('');
      successNotification({
        description: `Top-up of ${amountOfIcp} ICP successful.`,
      });
      setOpen(false);
    },
    onError: (error) => {
      errorNotification({
        description: mapCanisterError(error),
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
        <Button className="w-full" size="xl" data-testid="get-testnet-icp-trigger-btn">
          <CreditCard />
          Buy Testnet ICP
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent data-testid="get-testnet-icp-dialog">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Get Testnet ICP</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="tokens-amount">Amount</Label>
            <Input
              id="tokens-amount"
              data-testid="get-testnet-icp-amount-input"
              type="number"
              inputMode="decimal"
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
              data-testid="get-testnet-icp-submit-btn"
            >
              {acquireTokensMutation.isPending ? 'Topping Up...' : 'Top Up'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
