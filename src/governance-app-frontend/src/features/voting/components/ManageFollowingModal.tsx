import { KnownNeuron } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Circle, Disc } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Card } from '@components/Card';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { useGovernanceKnownNeurons } from '@hooks/governance/useGovernanceKnownNeurons';
import { successNotification } from '@utils/notification';
import { cn } from '@utils/shadcn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ManageFollowingModal = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const knownNeurons = useGovernanceKnownNeurons().data?.response;

  const [selectedNeuronId, setSelectedNeuronId] = useState<string | null>(null);

  const handleSelect = (neuron: KnownNeuron) => {
    setSelectedNeuronId(neuron.id.toString());
    successNotification({
      description: t(($) => $.manageFollowingModal.success, { name: neuron.name }),
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.manageFollowingModal.title)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t(($) => $.manageFollowingModal.description)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex h-[60vh] flex-col gap-4 overflow-y-auto px-1 py-1 sm:h-[70vh]">
          {knownNeurons?.map((neuron) => {
            const isSelected = selectedNeuronId === neuron.id.toString();
            return (
              <Card
                key={neuron.id.toString()}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  isSelected ? 'border-2 border-foreground bg-accent/50' : 'border',
                )}
                onClick={() => handleSelect(neuron)}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <Disc className="h-6 w-6 stroke-[3px]" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <h4 className="leading-none font-semibold">{neuron.name}</h4>
                    <span className="line-clamp-3 text-sm text-muted-foreground">
                      {neuron.description}
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" className="hidden sm:flex" asChild>
                    <Link
                      to="/voting/known-neurons/$id"
                      params={{ id: neuron.id.toString() }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t(($) => $.manageFollowingModal.seeDetails)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
