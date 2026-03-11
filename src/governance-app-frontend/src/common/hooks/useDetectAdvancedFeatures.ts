import { isNullish } from '@dfinity/utils';
import { useMemo } from 'react';

import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';

type DetectionResult = {
  isDetecting: boolean;
  detectedFeatures: Partial<AdvancedFeaturesSettings>;
  error: unknown;
};

/**
 * Orchestrator hook for detecting advanced features. Automatically determines which features need checking by comparing
 * the known advanced feature set against what's already stored in localStorage.
 *
 * Reuses the cached {@link useNnsDappAccount} query instead of making a
 * separate canister call, so the result is shared with the rest of the app.
 *
 * @param enabled - When false, the hook is inert (isDetecting = false).
 */
export const useDetectAdvancedFeatures = (enabled = true): DetectionResult => {
  const { missingFeatureKeys } = useAdvancedFeatures();

  const nnsDappAccount = useNnsDappAccount();

  const hasFeaturesToCheck = enabled && missingFeatureKeys.length > 0;
  const shouldCheckSubaccounts = missingFeatureKeys.includes(AdvancedFeature.Subaccounts);

  const detectedFeatures = useMemo<Partial<AdvancedFeaturesSettings>>(() => {
    if (!hasFeaturesToCheck) return {};

    const accountData = nnsDappAccount.data?.response;

    const detected: Partial<AdvancedFeaturesSettings> = {};
    if (shouldCheckSubaccounts) {
      detected[AdvancedFeature.Subaccounts] = isNullish(accountData)
        ? false
        : accountData.sub_accounts.length > 0;
    }
    return detected;
  }, [hasFeaturesToCheck, shouldCheckSubaccounts, nnsDappAccount.data]);

  return {
    isDetecting: hasFeaturesToCheck && nnsDappAccount.isLoading,
    detectedFeatures,
    error: nnsDappAccount.error,
  };
};
