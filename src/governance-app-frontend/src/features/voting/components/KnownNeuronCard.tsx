import type { KnownNeuron } from '@icp-sdk/canisters/nns';
import { nonNullish } from '@dfinity/utils';
import {
  CheckSquare2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleDot,
  LinkIcon,
  Loader2,
  Square,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedCollapse } from '@components/AnimatedCollapse';
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
  mode?: 'radio' | 'checkbox';
  neuron: KnownNeuron;
  onSelect: (neuron: KnownNeuron) => void;
};

export const KnownNeuronCard = ({
  neuron,
  isSelected,
  onSelect,
  isDisabled,
  isLoading,
  mode = 'radio',
}: Props) => {
  const { t } = useTranslation();
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
        'h-auto cursor-pointer p-0 shadow-none transition-all',
        mode === 'radio' && 'border-2',
        mode === 'checkbox' && 'rounded-none border-0',
        isSelected && mode === 'radio' && 'border-muted-foreground',
        isSelected && mode === 'checkbox' && 'bg-muted/30',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/50',
      )}
      aria-disabled={isDisabled}
      role="button"
      onClick={() => !isDisabled && onSelect(neuron)}
    >
      <div className="flex gap-4">
        <div className="flex shrink-0 items-center self-start py-5 pl-5">
          {isLoading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : mode === 'checkbox' ? (
            isSelected ? (
              <CheckSquare2 className="size-6 text-primary" />
            ) : (
              <Square className="size-6 text-muted-foreground" />
            )
          ) : isSelected ? (
            <CircleDot className="size-6 stroke-[3px]" />
          ) : (
            <Circle className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex min-w-0 grow-1 flex-col">
          <div className="flex items-center justify-between">
            <div className="flex min-h-16 flex-col justify-center gap-1 py-5">
              <h4 className={cn('leading-none', mode === 'radio' ? 'font-semibold' : 'text-sm')}>
                {neuron.name}
              </h4>
            </div>

            <Button
              variant="ghost"
              onClick={toggleExpanded}
              className={cn('min-w-20', mode === 'radio' ? 'rounded-xl' : 'rounded-none')}
            >
              {isExpanded ? (
                <ChevronUp className={'size-5'} />
              ) : (
                <ChevronDown className={'size-5'} />
              )}
            </Button>
          </div>

          <AnimatedCollapse open={isExpanded}>
            <div className="pr-4 pb-4 text-sm text-pretty text-muted-foreground lg:pr-12">
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
                      <span className="sr-only">{t(($) => $.common.opensInNewTab)}</span>
                    </a>
                  ))}
                </div>

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
          </AnimatedCollapse>
        </div>
      </div>
    </Card>
  );
};
