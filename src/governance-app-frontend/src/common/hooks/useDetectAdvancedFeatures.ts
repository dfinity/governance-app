import { isNullish } from '@dfinity/utils';

import { hasComplexFollowing } from '@features/voting/utils/topicFollowing';

import { useGovernanceNeurons } from '@hooks/governance';
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
 * @param enabled - When false, the hook is inert (isDetecting = false).
 */
export const useDetectAdvancedFeatures = (enabled = true): DetectionResult => {
  const { missingFeatureKeys } = useAdvancedFeatures();

  const hasFeaturesToCheck = enabled && missingFeatureKeys.length > 0;
  const shouldCheckSubaccounts = missingFeatureKeys.includes(AdvancedFeature.Subaccounts);
  const shouldCheckAdvancedFollowing = missingFeatureKeys.includes(
    AdvancedFeature.AdvancedFollowing,
  );

  const nnsDappAccount = useNnsDappAccount(hasFeaturesToCheck && shouldCheckSubaccounts);
  const neuronsQuery = useGovernanceNeurons({
    enabled: hasFeaturesToCheck && shouldCheckAdvancedFollowing,
  });

  const isPending =
    (shouldCheckSubaccounts && nnsDappAccount.isLoading) ||
    (shouldCheckAdvancedFollowing && neuronsQuery.isLoading);

  const detectedFeatures: Partial<AdvancedFeaturesSettings> = {};
  if (hasFeaturesToCheck && !isPending) {
    if (shouldCheckSubaccounts) {
      const accountData = nnsDappAccount.data?.response;
      detectedFeatures[AdvancedFeature.Subaccounts] = isNullish(accountData)
        ? false
        : accountData?.sub_accounts.length > 0;
    }

    if (shouldCheckAdvancedFollowing) {
      const neurons = neuronsQuery.data?.response ?? [];
      detectedFeatures[AdvancedFeature.AdvancedFollowing] = hasComplexFollowing(neurons);
    }
  }

  return {
    isDetecting: hasFeaturesToCheck && isPending,
    detectedFeatures,
    error: nnsDappAccount.error ?? neuronsQuery.error,
  };
};
