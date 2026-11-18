import { Link } from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NnsWordmark } from '@components/icons/NnsWordmark';
import { Kbd } from '@components/Kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/Tooltip';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useIconMotion } from '@hooks/useIconMotion';
import { useShortcutSettings } from '@hooks/useShortcutSettings';
import { useSidebarCollapsed } from '@hooks/useSidebarCollapsed';
import { SIDEBAR_SHORTCUT_KEY } from '@hooks/useSidebarShortcut';
import { isAccountsAreaEnabled } from '@utils/advancedFeatures';
import { cn } from '@utils/shadcn';

import { getNavigationItems } from './NavigationItems';
import { UserMenu } from './UserMenu';

const ACTIVE_ITEM_CLASS =
  'before:absolute before:left-0 before:w-[3px] before:h-6 before:bg-primary before:rounded-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary';

const ROW_CLASS =
  'relative flex items-center gap-3 rounded-md px-4 py-3 text-foreground-secondary transition-colors hover:bg-accent hover:text-accent-foreground';

/** Shows the label of an icon-only row on the right of the collapsed sidebar. */
const RowTooltip = ({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: ReactElement | string;
  children: ReactElement;
}) => {
  if (!collapsed) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export const Sidebar = ({ activeHref }: { activeHref?: string }) => {
  const { t } = useTranslation();
  const { features } = useAdvancedFeatures();
  const accountsEnabled = isAccountsAreaEnabled(features);
  const navigationItems = getNavigationItems({ accountsEnabled });
  const iconMotion = useIconMotion();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const { enabled: shortcutsEnabled } = useShortcutSettings();

  const [prevEnabled, setPrevEnabled] = useState(accountsEnabled);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  if (accountsEnabled !== prevEnabled) {
    setPrevEnabled(accountsEnabled);
    if (accountsEnabled) {
      setShouldAnimate(true);
    }
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed
    ? t(($) => $.common.sidebar.expandLabel)
    : t(($) => $.common.sidebar.collapseLabel);
  const shortcutHint = shortcutsEnabled ? <Kbd>{SIDEBAR_SHORTCUT_KEY}</Kbd> : null;

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'sticky top-0 z-20 hidden h-full w-80 flex-col border-r bg-background text-sm lg:flex',
        collapsed && 'w-17 shrink-0',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-6 pt-8 pb-6',
          // The fixed height keeps the navigation rows at the same place in both states.
          collapsed && 'h-21 justify-center px-0',
        )}
      >
        <img
          src="/infinity-mark.png"
          alt=""
          className={cn('h-7 w-auto', collapsed && 'h-5')}
          aria-hidden="true"
        />
        {!collapsed && <NnsWordmark className="h-[1.625rem] w-auto text-foreground" />}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map((item) => {
          const label = t(item.label as never);

          return (
            <RowTooltip key={item.href} collapsed={collapsed} label={label}>
              <Link
                to={item.href}
                {...iconMotion}
                className={cn(
                  ROW_CLASS,
                  shouldAnimate && item.href === '/accounts' && 'animate-highlight-pulse',
                  activeHref?.startsWith(item.href) && ACTIVE_ITEM_CLASS,
                )}
                onAnimationEnd={
                  item.href === '/accounts' ? () => setShouldAnimate(false) : undefined
                }
                activeProps={{ className: ACTIVE_ITEM_CLASS }}
              >
                <item.icon className="size-5 shrink-0" />
                <span className={cn(collapsed && 'sr-only')}>{label}</span>
              </Link>
            </RowTooltip>
          );
        })}
      </nav>
      <div className="p-2">
        <RowTooltip
          collapsed={collapsed}
          label={
            <>
              {toggleLabel}
              {shortcutHint}
            </>
          }
        >
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className={cn(
              ROW_CLASS,
              'w-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            data-testid="sidebar-toggle"
          >
            <ToggleIcon className="size-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{t(($) => $.common.sidebar.collapse)}</span>
                {shortcutHint}
              </>
            )}
          </button>
        </RowTooltip>
      </div>
      <div className="border-t p-3">
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
};
