import { useMatches } from '@tanstack/react-router';

import { NnsWordmark } from '@components/icons/NnsWordmark';

import { CommandPaletteButton } from './CommandPaletteButton';

/**
 * The brand and the command palette button above the page, below `lg`. It scrolls with the page.
 * A page that hides the bottom navigation has its own top bar, so it gets no header.
 */
export const MobileHeader = () => {
  const hidden = useMatches({
    select: (matches) => matches.some((match) => match.staticData.hidesBottomNav),
  });

  if (hidden) return null;

  return (
    // The negative margin takes the space from the top padding of `main`, so the sticky offsets of
    // the pages stay the same.
    <header className="-mt-5 mb-3 flex h-9 items-center justify-between lg:hidden">
      <div className="flex items-center gap-2">
        <img src="/infinity-mark.png" alt="" className="h-5 w-auto" aria-hidden="true" />
        <NnsWordmark className="h-[1.125rem] w-auto text-foreground" />
      </div>
      <CommandPaletteButton variant="header" className="-mr-2" />
    </header>
  );
};
