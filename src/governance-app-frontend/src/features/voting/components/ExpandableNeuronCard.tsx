import { KnownNeuron } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { ChevronDown, ChevronUp, Circle, CircleDot, LinkIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { MarkdownRenderer } from '@components/MarkdownRenderer';
import { cn } from '@utils/shadcn';
import { safeParseUrl } from '@utils/urls';

type Props = {
  neuron: KnownNeuron;
  isSelected: boolean;
  onSelect: (neuron: KnownNeuron) => void;
};

export const ExpandableNeuronCard = ({ neuron, isSelected, onSelect }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  const links = [
    `https://dashboard.internetcomputer.org/neuron/${neuron.id}`,
    ...(neuron?.links ?? []),
  ]
    .map(safeParseUrl)
    .filter(nonNullish);

  const committedTopics = (neuron?.committed_topics ?? []).flatMap((topic) =>
    Object.keys(topic[0] ?? {}),
  );

  return (
    <Card
      className={cn(
        'cursor-pointer border-2 p-4 transition-all hover:border-primary/50',
        isSelected ? 'border-2 border-primary/50' : 'border-2',
        isExpanded ? 'h-auto' : 'h-20',
      )}
      onClick={() => onSelect(neuron)}
    >
      <div className="flex gap-4">
        <div className="mt-2 flex-shrink-0">
          {isSelected ? (
            <CircleDot className="h-6 w-6 stroke-[3px]" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex grow-1 flex-col">
          <div className="flex grow-1 items-center justify-between">
            <h4 className="leading-none font-semibold">{neuron.name}</h4>

            <Button variant="ghost" size="icon-lg" onClick={toggleExpanded}>
              {isExpanded ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="animate-in text-sm text-muted-foreground fade-in slide-in-from-top-1">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {links.map(({ href, hostname }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="outline"
                        className="gap-1.5 font-normal hover:bg-secondary/80"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span className="max-w-[150px] truncate">{hostname}</span>
                      </Badge>
                    </a>
                  ))}
                </div>

                {/*Commited Topics*/}
                {committedTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {committedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                <MarkdownRenderer content={neuron.description || ''} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
