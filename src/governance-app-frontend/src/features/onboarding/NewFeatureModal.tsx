import { useNavigate } from '@tanstack/react-router';
import { ChartColumn, CheckCircle2, Coins, Download, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { ADVANCED_FEATURES } from '@constants/advancedFeatures';
import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { PAGE_ANNOUNCEMENTS } from '@constants/pageAnnouncements';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useCommandPaletteSettings } from '@hooks/useCommandPaletteSettings';
import { useDetectAdvancedFeatures } from '@hooks/useDetectAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { type AnnouncementKey, PageAnnouncement } from '@typings/featureAnnouncements';
import { notifyAdvancedFeatureChange } from '@utils/advancedFeatures';
import {
  isAdvancedFeature,
  markAnnouncementsSeen,
  splitUnseenAnnouncements,
} from '@utils/featureAnnouncements';
import { isApplePlatform } from '@utils/platform';
import { getStorageItem } from '@utils/storage';
import { useIsLoginHandoffActive } from '@common/auth/loginHandoff';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@common/components/ResponsiveDialog';

type AnnouncementContent = {
  icon?: LucideIcon;
  title: string;
  description: string;
  confirm: string;
  hint: string;
  /** The hint for a device with a keyboard, which can open the command palette. */
  shortcutHint?: string;
  highlights?: { icon: LucideIcon; label: string }[];
};

/**
 * Presents each advanced feature with `announce` and each available page in `PAGE_ANNOUNCEMENTS`
 * that a returning user did not see, one modal at a time. New users get the Welcome modal
 * instead, which marks them as seen.
 */
export function NewFeatureModal() {
  const { t } = useTranslation();
  const { features, setFeature, missingFeatureKeys } = useAdvancedFeatures();

  // Read once, so a choice in this session does not add or remove a modal.
  const [{ toShow, alreadyOn }] = useState(() =>
    getStorageItem(WELCOME_MODAL_STORAGE_KEY)
      ? splitUnseenAnnouncements(features)
      : { toShow: [], alreadyOn: [] },
  );
  const [queue, setQueue] = useState<AnnouncementKey[]>(toShow);
  // The announcement on screen. It stays after the last choice, so the modal can animate out.
  const [shown, setShown] = useState<AnnouncementKey | undefined>(toShow[0]);
  const navigate = useNavigate();
  const { enabled: isCommandPaletteEnabled } = useCommandPaletteSettings();

  // A feature that the user turned on in Settings needs no modal.
  useEffect(() => {
    if (alreadyOn.length > 0) markAnnouncementsSeen(alreadyOn);
  }, [alreadyOn]);

  const isLoginHandoffActive = useIsLoginHandoffActive();
  const { isDetecting, detectedFeatures } = useDetectAdvancedFeatures(
    queue.filter(isAdvancedFeature),
  );

  const isOpen = queue.length > 0 && !isDetecting && !isLoginHandoffActive;

  const detectedLabels: Partial<Record<AdvancedFeature, string>> = {
    [AdvancedFeature.Subaccounts]: t(($) => $.newFeatureModal.detected.subaccounts),
    [AdvancedFeature.AdvancedFollowing]: t(($) => $.newFeatureModal.detected.advancedFollowing),
    [AdvancedFeature.LedgerDevice]: t(($) => $.newFeatureModal.detected.ledgerDevice),
  };

  const pageContent: Record<PageAnnouncement, AnnouncementContent> = {
    [PageAnnouncement.Reports]: {
      title: t(($) => $.newFeatureModal.pages.reports.title),
      description: t(($) => $.newFeatureModal.pages.reports.description),
      confirm: t(($) => $.newFeatureModal.pages.reports.open),
      hint: t(($) => $.newFeatureModal.pages.reports.hint),
      shortcutHint: isCommandPaletteEnabled
        ? t(($) => $.newFeatureModal.pages.reports.hintShortcut, {
            shortcut: isApplePlatform ? '⌘K' : 'Ctrl K',
          })
        : undefined,
      highlights: [
        { icon: ChartColumn, label: t(($) => $.newFeatureModal.pages.reports.yearSummary) },
        { icon: Download, label: t(($) => $.newFeatureModal.pages.reports.csv) },
        { icon: Coins, label: t(($) => $.newFeatureModal.pages.reports.fiat) },
      ],
    },
  };

  if (shown === undefined) return null;

  const content: AnnouncementContent = isAdvancedFeature(shown)
    ? {
        icon: ADVANCED_FEATURES.find(({ key }) => key === shown)?.icon,
        title: t(($) => $.userAccount.advancedFeatures.items[shown].label),
        description: t(($) => $.userAccount.advancedFeatures.items[shown].description),
        confirm: t(($) => $.newFeatureModal.turnOn),
        hint: t(($) => $.newFeatureModal.hint),
      }
    : { ...pageContent[shown], icon: PAGE_ANNOUNCEMENTS.find(({ key }) => key === shown)?.icon };
  const Icon = content.icon;
  const detectedLabel =
    isAdvancedFeature(shown) && detectedFeatures[shown] === true
      ? detectedLabels[shown]
      : undefined;
  const position = toShow.indexOf(shown) + 1;

  const close = (confirm: boolean) => {
    const current = queue[0];
    if (current === undefined) return;

    if (!isAdvancedFeature(current)) {
      const page = PAGE_ANNOUNCEMENTS.find(({ key }) => key === current);
      if (confirm && page) void navigate({ to: page.to });
    } else if (confirm) {
      setFeature(current, true);
      notifyAdvancedFeatureChange(t, current, true);
    } else if (missingFeatureKeys.includes(current)) {
      setFeature(current, false);
    }
    markAnnouncementsSeen([current]);
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest[0] !== undefined) setShown(rest[0]);
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <ResponsiveDialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="flex flex-col gap-0 p-0 md:max-h-[90dvh] md:max-w-md"
        data-testid="new-feature-modal"
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-6 pt-6 md:px-6">
          <div className="flex items-center justify-between">
            {Icon && (
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
            )}
            {toShow.length > 1 && (
              <span className="text-xs text-muted-foreground" data-testid="new-feature-position">
                {t(($) => $.newFeatureModal.position, { position, total: toShow.length })}
              </span>
            )}
          </div>
          <p className="text-xs font-medium tracking-wider text-primary uppercase">
            {t(($) => $.newFeatureModal.eyebrow)}
          </p>
          <ResponsiveDialogTitle className="text-2xl">{content.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-sm text-muted-foreground">
            {content.description}
          </ResponsiveDialogDescription>
          {content.highlights && (
            <ul
              className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm"
              data-testid="new-feature-highlights"
            >
              {content.highlights.map(({ icon: HighlightIcon, label }) => (
                <li key={label} className="flex items-start gap-2.5">
                  <HighlightIcon
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          )}
          {detectedLabel && (
            <div
              className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm"
              data-testid="new-feature-detected"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {detectedLabel}
            </div>
          )}
        </div>
        <ResponsiveDialogFooter className="flex flex-col gap-3 px-6 pt-6 pb-6">
          <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
            <Button
              variant="outline"
              onClick={() => close(false)}
              data-testid="new-feature-not-now-btn"
            >
              {t(($) => $.newFeatureModal.notNow)}
            </Button>
            <Button onClick={() => close(true)} data-testid="new-feature-turn-on-btn">
              {content.confirm}
            </Button>
          </div>
          {content.shortcutHint ? (
            <>
              <p className="text-center text-xs text-muted-foreground pointer-coarse:hidden">
                {content.shortcutHint}
              </p>
              <p className="hidden text-center text-xs text-muted-foreground pointer-coarse:block">
                {content.hint}
              </p>
            </>
          ) : (
            <p className="text-center text-xs text-muted-foreground">{content.hint}</p>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
