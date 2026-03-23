import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { useNavigate } from '@tanstack/react-router';
import { Banknote, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

import { NeuronStandaloneAction } from './neuronDetail';

type Props = {
  neuron: NeuronInfo;
  showDisburseIcp: boolean;
  showDisburseMaturity: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisburseModal({
  neuron,
  showDisburseIcp,
  showDisburseMaturity,
  isOpen,
  onOpenChange,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (action: NeuronStandaloneAction) => {
    onOpenChange(false);
    navigate({
      to: '/neurons',
      search: {
        neuronId: neuron.neuronId.toString(),
        action,
      },
    });
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col focus:outline-none">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.disburseModal.title)}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 md:px-0 md:pb-0">
          <p className="text-sm text-muted-foreground">
            {t(($) => $.disburseModal.description)}
          </p>

          <div className="flex flex-col gap-3">
            {showDisburseIcp && (
              <button
                className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                onClick={() => handleSelect(NeuronStandaloneAction.DisburseIcp)}
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

            {showDisburseMaturity && (
              <button
                className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                onClick={() => handleSelect(NeuronStandaloneAction.DisburseMaturity)}
              >
                <Banknote className="size-5 shrink-0" aria-hidden="true" />
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
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
