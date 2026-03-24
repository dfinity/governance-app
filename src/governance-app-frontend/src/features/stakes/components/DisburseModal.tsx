import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Coins } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { E8Sn } from '@constants/extra';
import { bigIntDiv } from '@utils/bigInt';
import {
  getNeuronFreeMaturityE8s,
  getNeuronIsDissolved,
  getNeuronStakeAfterFeesE8s,
  shortenNeuronId,
} from '@utils/neuron';
import { formatNumber } from '@utils/numbers';

import { NeuronStandaloneAction } from './neuronDetail';

type Props = {
  neurons: NeuronInfo[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseModal({ neurons, isOpen, onOpenChange }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedNeuron, setSelectedNeuron] = useState<NeuronInfo | null>(null);

  const skipNeuronStep = neurons.length === 1;
  const currentNeuron = skipNeuronStep ? neurons[0] : selectedNeuron;
  const showTypeStep = currentNeuron !== null;

  const isDissolved = currentNeuron ? getNeuronIsDissolved(currentNeuron) : false;
  const hasMaturity = currentNeuron ? getNeuronFreeMaturityE8s(currentNeuron) > 0n : false;

  const navigateToAction = (neuron: NeuronInfo, action: NeuronStandaloneAction) => {
    handleOpenChange(false);
    navigate({
      to: '/neurons',
      search: {
        neuronId: neuron.neuronId.toString(),
        action,
      },
    });
  };

  const handleSelectNeuron = (neuron: NeuronInfo) => {
    const dissolved = getNeuronIsDissolved(neuron);
    const maturity = getNeuronFreeMaturityE8s(neuron) > 0n;

    // Single option → skip type step and navigate directly
    if (dissolved && !maturity) {
      navigateToAction(neuron, NeuronStandaloneAction.DisburseIcp);
    } else if (!dissolved && maturity) {
      navigateToAction(neuron, NeuronStandaloneAction.DisburseMaturity);
    } else {
      setSelectedNeuron(neuron);
    }
  };

  const handleBack = () => setSelectedNeuron(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedNeuron(null);
    onOpenChange(open);
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col focus:outline-none sm:max-w-lg">
        <ResponsiveDialogHeader>
          <div className="relative flex items-center justify-center">
            {showTypeStep && !skipNeuronStep && (
              <button
                onClick={handleBack}
                className="absolute left-0 rounded-md p-1 hover:bg-muted"
                aria-label={t(($) => $.common.back)}
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <ResponsiveDialogTitle>{t(($) => $.disburseModal.title)}</ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 md:px-0 md:pb-0">
          {!showTypeStep ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t(($) => $.disburseModal.selectNeuron)}
              </p>
              <div className="flex flex-col gap-3">
                {neurons.map((neuron) => {
                  const staked = bigIntDiv(getNeuronStakeAfterFeesE8s(neuron), E8Sn);
                  const maturity = bigIntDiv(getNeuronFreeMaturityE8s(neuron), E8Sn);
                  const dissolved = getNeuronIsDissolved(neuron);
                  return (
                    <button
                      key={String(neuron.neuronId)}
                      className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                      onClick={() => handleSelectNeuron(neuron)}
                    >
                      <Coins className="size-5 shrink-0" aria-hidden="true" />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold">
                          {t(($) => $.disburseModal.neuronLabel)} {shortenNeuronId(neuron.neuronId)}
                        </span>
                        <div className="flex gap-2">
                          {dissolved && (
                            <Badge variant="outline">
                              {formatNumber(staked)} {t(($) => $.common.icp)}
                            </Badge>
                          )}
                          {maturity > 0 && (
                            <Badge variant="outline">
                              {formatNumber(maturity)} {t(($) => $.disburseModal.maturityLabel)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t(($) => $.disburseModal.description)}
              </p>
              <div className="flex flex-col gap-3">
                {isDissolved && (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                    onClick={() =>
                      currentNeuron &&
                      navigateToAction(currentNeuron, NeuronStandaloneAction.DisburseIcp)
                    }
                  >
                    <Coins className="size-5 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">
                        {t(($) => $.disburseModal.disburseIcp.title)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(($) => $.disburseModal.disburseIcp.description)}
                      </span>
                    </div>
                  </button>
                )}

                {hasMaturity && (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                    onClick={() =>
                      currentNeuron &&
                      navigateToAction(currentNeuron, NeuronStandaloneAction.DisburseMaturity)
                    }
                  >
                    <Coins className="size-5 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">
                        {t(($) => $.disburseModal.disburseMaturity.title)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(($) => $.disburseModal.disburseMaturity.description)}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
