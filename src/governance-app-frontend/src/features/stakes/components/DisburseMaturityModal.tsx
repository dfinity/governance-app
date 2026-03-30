import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { E8Sn, ICP_MIN_DISBURSE_MATURITY_AMOUNT } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import { getNeuronFreeMaturityE8s } from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { useDisburseMaturity } from '../hooks/useDisburseMaturity';

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

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidationError(null);
    }
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

    execute(() => mutateAsync({ neuronId: neuron.neuronId, toAccountId: resolvedAccountId }));
  };

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
            {subaccountsEnabled && (
              <div className="space-y-1">
                <Label htmlFor="disburse-maturity-to-account">
                  {t(($) => $.neuronDetailModal.disburseMaturity.toAccount)}
                </Label>
                <AccountSelect
                  id="disburse-maturity-to-account"
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  data-testid="disburse-maturity-account-select"
                />
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
              className="flex-1 transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-0"
              onClick={close}
            >
              {t(($) => $.neuronDetailModal.disburseMaturity.cancel)}
            </Button>
            <Button size="xl" className="flex-1" onClick={() => handleConfirm(execute)}>
              {t(($) => $.neuronDetailModal.disburseMaturity.confirm)}
            </Button>
          </MutationDialogFooter>
        </>
      )}
    </MutationDialog>
  );
}
