import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WELCOME_MODAL_STORAGE_KEY } from '@constants/extra';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { useDetectAdvancedFeatures } from '@hooks/useDetectAdvancedFeatures';
import type { AdvancedFeature } from '@typings/advancedFeatures';
import { isAnnouncedFeature } from '@utils/featureAnnouncements';
import { infoNotification } from '@utils/notification';
import { getStorageItem } from '@utils/storage';

/** The missing features that a toast presents. A feature with a modal is left to the modal. */
const toastFeatureKeys = (keys: AdvancedFeature[]): AdvancedFeature[] =>
  keys.filter((key) => !isAnnouncedFeature(key));

/**
 * Runs on app start for returning users only.
 * Skipped on first visit (the WelcomeModal handles detection for new users).
 * Checks if any new features have been added to the registry since
 * the user last visited. If a new feature is detected,
 * shows a toast notification (does not auto-enable).
 * If not detected, writes the default silently.
 * A feature with a modal is left to `NewFeatureModal`.
 */
export const useNewFeatureCheck = () => {
  const { t } = useTranslation();
  const isReturningUser =
    typeof window !== 'undefined' && !!getStorageItem(WELCOME_MODAL_STORAGE_KEY);

  const { setFeature, missingFeatureKeys } = useAdvancedFeatures();
  // Read once: a write of any feature stores all of them, and must not end the check.
  const [featureKeys] = useState(() =>
    isReturningUser ? toastFeatureKeys(missingFeatureKeys) : [],
  );
  const { isDetecting, detectedFeatures } = useDetectAdvancedFeatures(featureKeys);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (isDetecting || featureKeys.length === 0 || hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    for (const key of featureKeys) {
      const detected = detectedFeatures[key] === true;
      if (missingFeatureKeys.includes(key)) setFeature(key, false);

      if (detected) {
        const label = t(($) => $.common.newFeatureCheck[key]);
        infoNotification({
          description: t(($) => $.common.newFeatureCheck.detected, { feature: label }),
        });
      }
    }
  }, [isDetecting, featureKeys, missingFeatureKeys, detectedFeatures, setFeature, t]);
};
