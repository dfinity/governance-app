import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Info } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

import { AccountSelect } from '@features/accounts/components/AccountSelect';
import { useAccountSelection } from '@features/accounts/hooks/useAccountSelection';

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
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronStakeAfterFeesE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useDisburseNeuron } from '../hooks/useDisburseNeuron';

type Props = {
  neuron: NeuronInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseIcpModal({ neuron, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useDisburseNeuron();
  const { selectedAccountId, setSelectedAccountId, resolvedAccountId, subaccountsEnabled } =
    useAccountSelection();

  const stakedAmount = neuron ? bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn) : 0;

  return (
    <MutationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      processingMessage={t(($) => $.neuronDetailModal.disburseIcp.confirming)}
      successMessage={t(($) => $.neuronDetailModal.disburseIcp.success)}
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
            {subaccountsEnabled && (
              <div className="space-y-1">
                <Label htmlFor="disburse-icp-to-account">
                  {t(($) => $.neuronDetailModal.disburseIcp.toAccount)}
                </Label>
                <AccountSelect
                  id="disburse-icp-to-account"
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  data-testid="disburse-icp-account-select"
                />
              </div>
            )}

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <Trans
                  i18nKey={($) => $.neuronDetailModal.disburseIcp.info}
                  t={t}
                  values={{ amount: formatNumber(stakedAmount) }}
                  components={{ strong: <strong /> }}
                />
              </AlertDescription>
            </Alert>
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
            <Button
              size="xl"
              className="md:flex-1"
              onClick={() =>
                neuron &&
                execute(() =>
                  mutateAsync({ neuronId: neuron.neuronId, toAccountId: resolvedAccountId }),
                )
              }
            >
              {t(($) => $.neuronDetailModal.disburseIcp.confirm)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
