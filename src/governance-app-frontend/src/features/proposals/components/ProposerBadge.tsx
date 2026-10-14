import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { shortenNeuronId } from '@utils/neuron';

type Props = {
  proposer: bigint;
  knownNeuronNames: Map<bigint, string>;
};

export const ProposerBadge = ({ proposer, knownNeuronNames }: Props) => {
  const { t } = useTranslation();
  const knownName = knownNeuronNames.get(proposer);
  const neuronId = proposer.toString();

  return (
    <Badge
      variant="secondary"
      className="gap-1.5 font-normal"
      title={neuronId}
      data-testid="proposal-proposer-badge"
    >
      <User className="size-3.5" />
      <span className="max-w-[150px] truncate" aria-hidden="true">
        {knownName ?? shortenNeuronId(proposer)}
      </span>
      <span className="sr-only">
        {t(($) => $.proposal.proposer, { name: knownName ?? neuronId })}
      </span>
    </Badge>
  );
};
