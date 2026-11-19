import { SearchIcon } from 'lucide-react';
import type { ComponentProps, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { Kbd, KbdGroup } from '@components/Kbd';
import { openCommandPalette } from '@hooks/useCommandPaletteOpen';
import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';
import { isApplePlatform } from '@utils/platform';
import { cn } from '@utils/shadcn';

type Props = ComponentProps<'button'> &
  ({ variant: 'sidebar'; collapsed: boolean } | { variant: 'header'; collapsed?: never });

/** The Cmd+K keys. A touch screen has no keyboard, so it gets no hint. */
export const CommandPaletteShortcutHint = () => (
  <KbdGroup className="pointer-coarse:hidden">
    <Kbd>{isApplePlatform ? '⌘' : 'Ctrl'}</Kbd>
    <Kbd>K</Kbd>
  </KbdGroup>
);

/** Opens the command palette, for a device without a keyboard. Hidden while the palette is off. */
export const CommandPaletteButton = ({
  variant,
  collapsed,
  className,
  onClick,
  ...props
}: Props) => {
  const { t } = useTranslation();
  const { enabled } = useCommandPaletteSettings();

  if (!enabled) return null;

  const label = t(($) => $.common.commandPalette.search);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    openCommandPalette(variant === 'sidebar' ? 'sidebar' : 'mobile_header');
  };

  if (variant === 'header') {
    return (
      <Button
        {...props}
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={label}
        className={cn('text-foreground-secondary', className)}
      >
        <SearchIcon className="size-5" />
      </Button>
    );
  }

  return (
    <button
      {...props}
      type="button"
      onClick={handleClick}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-md border px-4 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
        collapsed && 'justify-center px-0',
        className,
      )}
    >
      <SearchIcon className="size-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          <CommandPaletteShortcutHint />
        </>
      )}
    </button>
  );
};
