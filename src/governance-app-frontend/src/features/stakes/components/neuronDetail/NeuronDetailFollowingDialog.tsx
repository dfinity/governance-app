import { type KnownNeuron, type NeuronInfo } from '@icp-sdk/canisters/nns';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { TopicFollowingAccordion } from '@features/voting/components/TopicFollowingAccordion';
import { getNeuronTopicFolloweesMap } from '@features/voting/utils/topicFollowing';

import { Button } from '@components/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neuron: NeuronInfo;
  knownNeurons: KnownNeuron[];
};

export function NeuronDetailFollowingDialog({ open, onOpenChange, neuron, knownNeurons }: Props) {
  const { t } = useTranslation();
  const followeesMap = getNeuronTopicFolloweesMap(neuron);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(($) => $.neuron.followingDetails.title)}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto rounded-lg border">
          <TopicFollowingAccordion
            followeesMap={followeesMap}
            knownNeurons={knownNeurons}
            mode="readonly"
          />
        </div>

        <div className="pt-3 pb-4 md:pb-0">
          <Button variant="outline" size="xl" className="w-full" asChild>
            <Link to="/voting" search={{ manageFollowing: true }}>
              {t(($) => $.neuron.followingDetails.editLink)}
            </Link>
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
