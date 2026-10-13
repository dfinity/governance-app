import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { cn } from '@utils/shadcn';

import { useVoting } from '../hooks/useVoting';
import { PROPOSAL_VOTING_ID, scrollToProposalVoting } from '../utils';

type Props = {
  proposal: ProposalInfo;
};

const jumpToVoting = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  scrollToProposalVoting();
};

/** Header badge link to the voting card. Visible from the `lg` breakpoint. */
export const ProposalJumpToVoteLink: React.FC<Props> = ({ proposal }) => {
  const { t } = useTranslation();
  const { canVote } = useVoting(proposal);

  if (!canVote) return null;

  return (
    <Badge asChild className="hidden gap-1.5 lg:inline-flex">
      <a href={`#${PROPOSAL_VOTING_ID}`} onClick={jumpToVoting}>
        <ArrowDown className="h-3.5 w-3.5" />
        {t(($) => $.proposal.jumpToVote)}
      </a>
    </Badge>
  );
};

/**
 * Sticky button to the voting card below the `lg` breakpoint.
 * Visible only while the voting card is below the viewport.
 * The wrapper has no height, and its negative margin cancels the parent's `gap-6`.
 */
export const ProposalJumpToVoteButton: React.FC<Props> = ({ proposal }) => {
  const { t } = useTranslation();
  const { canVote } = useVoting(proposal);
  const [isVotingBelow, setIsVotingBelow] = useState(false);

  useEffect(() => {
    const voting = document.getElementById(PROPOSAL_VOTING_ID);
    if (!canVote || !voting) return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsVotingBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0),
    );
    observer.observe(voting);
    return () => observer.disconnect();
  }, [canVote]);

  if (!canVote) return null;

  return (
    <div className="pointer-events-none sticky bottom-4 z-10 -mt-6 flex h-0 items-end justify-center lg:hidden">
      <Button
        asChild
        size="lg"
        className={cn(
          'pointer-events-auto shadow-lg transition-[background-color,opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none',
          !isVotingBelow && 'invisible translate-y-2 opacity-0',
        )}
      >
        <a href={`#${PROPOSAL_VOTING_ID}`} onClick={jumpToVoting}>
          <ArrowDown />
          {t(($) => $.proposal.jumpToVote)}
        </a>
      </Button>
    </div>
  );
};
