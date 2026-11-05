import { User } from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { shortenNeuronId } from '@utils/neuron';

type Props = {
  proposer: bigint;
  knownNeuronNames: Map<bigint, string>;
  /** Renders a button that also opens the tooltip on tap and keyboard focus. Not for use inside a link. */
  interactive?: boolean;
};

export const ProposerBadge = ({ proposer, knownNeuronNames, interactive = false }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const knownName = knownNeuronNames.get(proposer);
  const neuronId = proposer.toString();

  // Radix closes the tooltip on click. Preventing the default keeps a tap open on touch screens.
  const openOnTap = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  const content = (
    <>
      <User className="size-3.5" />
      <span className="max-w-[150px] truncate" aria-hidden="true">
        {knownName ?? shortenNeuronId(proposer)}
      </span>
      <span className="sr-only">
        {t(($) => $.proposal.proposer, { name: knownName ?? neuronId })}
      </span>
    </>
  );

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Badge
          asChild={interactive}
          variant="secondary"
          className="gap-1.5 font-normal"
          data-testid="proposal-proposer-badge"
        >
          {interactive ? (
            <button type="button" className="cursor-help" onClick={openOnTap}>
              {content}
            </button>
          ) : (
            content
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t(($) => $.neuron.neuronId, { neuronId })}</TooltipContent>
    </Tooltip>
  );
};
