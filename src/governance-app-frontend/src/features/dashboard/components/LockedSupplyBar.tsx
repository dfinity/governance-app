import { Fragment, type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type LockedSupplyBreakdown } from '@features/dashboard/utils/lockedSupply';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { formatCompactNumber, formatPercentage } from '@utils/numbers';
import { cn } from '@utils/shadcn';

type Props = {
  breakdown: LockedSupplyBreakdown;
};

type PartKey = Exclude<keyof LockedSupplyBreakdown, 'totalSupply'>;

// Solid colors, so the swatches on the tooltip match the bar. The dark card needs larger steps.
const PART_COLORS: Record<PartKey, string> = {
  maxLock: 'bg-primary',
  shorterLock:
    'bg-[color-mix(in_oklab,var(--primary)_45%,var(--card))] dark:bg-[color-mix(in_oklab,var(--primary)_65%,var(--card))]',
  dissolving:
    'bg-[color-mix(in_oklab,var(--primary)_22%,var(--card))] dark:bg-[color-mix(in_oklab,var(--primary)_40%,var(--card))]',
  notLocked: 'bg-[color-mix(in_oklab,var(--foreground)_10%,var(--card))]',
};

const LOCKED_PARTS: PartKey[] = ['maxLock', 'shorterLock', 'dissolving'];
const ALL_PARTS: PartKey[] = [...LOCKED_PARTS, 'notLocked'];

const formatShare = (share: number) => formatPercentage(share, { minFraction: 1, maxFraction: 1 });

/**
 * A bar of the total ICP supply. The filled parts are the locked ICP, by lock type.
 * The legend opens on hover, keyboard focus, and tap.
 */
export const LockedSupplyBar = ({ breakdown }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const labels: Record<PartKey, string> = {
    maxLock: t(($) => $.home.lockedSupply.maxLock),
    shorterLock: t(($) => $.home.lockedSupply.shorterLock),
    dissolving: t(($) => $.home.lockedSupply.dissolving),
    notLocked: t(($) => $.home.lockedSupply.notLocked),
  };
  const shareOf = (part: PartKey) => breakdown[part] / breakdown.totalSupply;
  const totalSupplyLabel = t(($) => $.home.lockedSupply.totalSupply);
  const totalSupplyAmount = formatCompactNumber(breakdown.totalSupply);

  const description = [
    ...ALL_PARTS.map((part) =>
      t(($) => $.home.lockedSupply.part, {
        label: labels[part],
        amount: formatCompactNumber(breakdown[part]),
        share: formatShare(shareOf(part)),
      }),
    ),
    t(($) => $.home.lockedSupply.total, { label: totalSupplyLabel, amount: totalSupplyAmount }),
  ].join(' ');

  // Radix closes the tooltip on click. Preventing the default keeps a tap open on touch screens.
  const openOnTap = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex h-5 w-full cursor-help items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50"
          onClick={openOnTap}
          data-testid="locked-supply-bar"
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-2 w-full gap-0.5 overflow-hidden rounded-full',
              PART_COLORS.notLocked,
            )}
          >
            {LOCKED_PARTS.filter((part) => breakdown[part] > 0).map((part) => (
              <span
                key={part}
                className={cn('h-full shrink-0', PART_COLORS[part])}
                style={{ width: `${shareOf(part) * 100}%` }}
              />
            ))}
          </span>
          <span className="sr-only">{description}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[var(--radix-tooltip-content-available-width,100vw)] px-3 py-2">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-0.5">
          {ALL_PARTS.map((part) => (
            <Fragment key={part}>
              <span className={cn('size-2 rounded-[2px]', PART_COLORS[part])} />
              <span className="break-words">{labels[part]}</span>
              <span className="text-right tabular-nums">
                {formatCompactNumber(breakdown[part])}
              </span>
              <span className="text-right tabular-nums">{formatShare(shareOf(part))}</span>
            </Fragment>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 border-t border-background/20 pt-1.5 text-background/75">
          <span>{totalSupplyLabel}</span>
          <span className="tabular-nums">
            {t(($) => $.home.lockedSupply.amount, { amount: totalSupplyAmount })}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
