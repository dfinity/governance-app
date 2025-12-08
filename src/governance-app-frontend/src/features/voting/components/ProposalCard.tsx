import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { Vote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeWithIcon } from '@ui';

import { CertifiedBadge } from '@components/badges/certified/CertifiedBadge';

type ProposalCardProps = {
  proposal: ProposalInfo;
  canUserVote: boolean;
  certified?: boolean;
};

export function ProposalCard({ proposal, canUserVote, certified }: ProposalCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex h-full cursor-pointer flex-col transition-colors hover:bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-base leading-tight font-medium break-words">
          #{proposal.id?.toString()} {proposal.proposal?.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex items-center justify-between gap-2 pt-2">
        <BadgeWithIcon
          iconLeading={canUserVote ? Vote : undefined}
          color={canUserVote ? 'blue-light' : 'blue'}
        >
          {t(($) => $.enums.ProposalStatus[proposal.status])}
        </BadgeWithIcon>
        <CertifiedBadge certified={certified} />
      </CardFooter>
    </Card>
  );
}
