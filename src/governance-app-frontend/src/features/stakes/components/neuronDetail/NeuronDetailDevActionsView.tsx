import type { NeuronInfo } from '@icp-sdk/canisters/nns';
import { Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';

import { AddHotkeyModal } from '@/dev/AddHotkeyModal';
import { IncreaseMaturityModal } from '@/dev/IncreaseMaturityModal';
import { CreateDummyProposalsButton } from '@/dev/makeDummyProposals';
import { UnlockNeuronModal } from '@/dev/UnlockNeuronModal';

type Props = {
  neuron: NeuronInfo;
  isHotkey: boolean;
};

export function NeuronDetailDevActionsView({ neuron, isHotkey }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t(($) => $.devActionsModal.description)}</p>

      {isHotkey && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400">
          <Key className="h-4 w-4" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            {t(($) => $.neuronDetailModal.hotkeyNotice)}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {!isHotkey && (
          <>
            <IncreaseMaturityModal neuron={neuron} />
            <UnlockNeuronModal neuron={neuron} />
            <CreateDummyProposalsButton neuron={neuron} />
          </>
        )}
        <AddHotkeyModal neuron={neuron} />
      </div>
    </div>
  );
}
