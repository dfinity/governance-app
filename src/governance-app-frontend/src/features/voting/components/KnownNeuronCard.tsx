import type { KnownNeuron } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import { ChevronDown, ChevronUp, Circle, CircleDot, LinkIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@components/badge';
import { Button } from '@components/button';
import { Card } from '@components/Card';
import { MarkdownRenderer } from '@components/MarkdownRenderer';
import { DASHBOARD_URL } from '@constants/extra';
import { cn } from '@utils/shadcn';
import { safeParseUrl } from '@utils/urls';

type Props = {
  isDisabled: boolean;
  isLoading?: boolean;
  isSelected: boolean;
  neuron: KnownNeuron;
  onSelect: (neuron: KnownNeuron) => void;
};

export const KnownNeuronCard = ({ neuron, isSelected, onSelect, isDisabled, isLoading }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  const links = [`${DASHBOARD_URL}/${neuron.id}`, ...(neuron?.links ?? [])]
    .map(safeParseUrl)
    .filter(nonNullish);

  const committedTopics = (neuron?.committed_topics ?? []).flatMap((topic) =>
    Object.keys(topic[0] ?? {}),
  );

  return (
    <Card
      className={cn(
        'h-auto cursor-pointer border-2 p-4 transition-all',
        isSelected && 'border-muted-foreground',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-muted-foreground',
      )}
      aria-disabled={isDisabled}
      role="button"
      onClick={() => !isDisabled && onSelect(neuron)}
    >
      <div className="flex gap-4">
        <div className="mt-2 flex-shrink-0">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : isSelected ? (
            <CircleDot className="size-6 stroke-[3px]" />
          ) : (
            <Circle className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 grow-1 flex-col">
          <div className="flex grow-1 items-center justify-between">
            <h4 className="leading-none font-semibold">{neuron.name}</h4>

            <Button variant="ghost" size="icon-lg" onClick={toggleExpanded}>
              {isExpanded ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
            </Button>
          </div>

          {isExpanded && (
            <div className="animate-in pr-8 text-sm text-muted-foreground fade-in slide-in-from-top-1">
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

                {nonNullish(neuron.description) && (
                  <MarkdownRenderer content={neuron.description} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
