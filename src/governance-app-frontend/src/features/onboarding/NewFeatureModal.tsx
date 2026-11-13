import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@components/button';
import { ADVANCED_FEATURES } from '@constants/advancedFeatures';
import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useDetectAdvancedFeatures } from '@hooks/useDetectAdvancedFeatures';
import { AdvancedFeature } from '@typings/advancedFeatures';
import { notifyAdvancedFeatureChange } from '@utils/advancedFeatures';
import { markAnnouncementsSeen, splitUnseenAnnouncements } from '@utils/featureAnnouncements';
import { getStorageItem } from '@utils/storage';
import { useIsLoginHandoffActive } from '@common/auth/loginHandoff';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from '@common/components/ResponsiveDialog';

/**
 * Presents each advanced feature with `announce` that a returning user did not see, one modal at
 * a time. New users get the Welcome modal instead, which marks the features as seen.
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
  const [queue, setQueue] = useState<AdvancedFeature[]>(toShow);
  // The feature on screen. It stays after the last choice, so the modal can animate out.
  const [shown, setShown] = useState<AdvancedFeature | undefined>(toShow[0]);

  // A feature that the user turned on in Settings needs no modal.
  useEffect(() => {
    if (alreadyOn.length > 0) markAnnouncementsSeen(alreadyOn);
  }, [alreadyOn]);

  const isLoginHandoffActive = useIsLoginHandoffActive();
  const { isDetecting, detectedFeatures } = useDetectAdvancedFeatures(queue);

  const isOpen = queue.length > 0 && !isDetecting && !isLoginHandoffActive;

  const detectedLabels: Partial<Record<AdvancedFeature, string>> = {
    [AdvancedFeature.Subaccounts]: t(($) => $.newFeatureModal.detected.subaccounts),
    [AdvancedFeature.AdvancedFollowing]: t(($) => $.newFeatureModal.detected.advancedFollowing),
    [AdvancedFeature.LedgerDevice]: t(($) => $.newFeatureModal.detected.ledgerDevice),
  };

  if (shown === undefined) return null;

  const Icon = ADVANCED_FEATURES.find(({ key }) => key === shown)?.icon;
  const detectedLabel = detectedFeatures[shown] === true ? detectedLabels[shown] : undefined;
  const position = toShow.indexOf(shown) + 1;

  const close = (turnOn: boolean) => {
    const current = queue[0];
    if (current === undefined) return;

    if (turnOn) {
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
        className="flex flex-col gap-0 p-0 md:max-w-md"
        data-testid="new-feature-modal"
      >
        <div className="flex flex-col gap-3 px-6 pt-6 md:px-6">
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
          <ResponsiveDialogTitle className="text-2xl">
            {t(($) => $.userAccount.advancedFeatures.items[shown].label)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-sm text-muted-foreground">
            {t(($) => $.userAccount.advancedFeatures.items[shown].description)}
          </ResponsiveDialogDescription>
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
              {t(($) => $.newFeatureModal.turnOn)}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {t(($) => $.newFeatureModal.hint)}
          </p>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
