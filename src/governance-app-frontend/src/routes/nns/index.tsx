import { createFileRoute, Link } from '@tanstack/react-router';
import { Brain, Vote, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SimpleCard } from '@/common/ui/extra/SimpleCard';
import useTitle from '@hooks/useTitle';

import { VotingPowerChart } from '@/features/dashboard/components/VotingPowerChart';

export const Route = createFileRoute('/nns/')({
  component: NnsIndex,
});

function NnsIndex() {
  const { t } = useTranslation();
  useTitle(t(($) => $.common.nns));

  const cards = [
    {
      title: t(($) => $.common.seeProposals),
      icon: Vote,
      href: '/nns/proposals',
      value: '12', // Mock value
    },
    {
      title: t(($) => $.common.seeNeurons),
      icon: Brain,
      href: '/nns/neurons',
      value: '3', // Mock value
    },
    {
      title: t(($) => $.common.seeAccounts),
      icon: Wallet,
      href: '/nns/accounts',
      value: '$1,234.56', // Mock value
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-full lg:col-span-2">
          <VotingPowerChart />
        </div>
        <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-2">
          {cards.map((card) => (
            <Link to={card.href} key={card.title} className="group h-full">
              <SimpleCard className="h-full transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                  <card.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold">{card.value}</div>
              </SimpleCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
