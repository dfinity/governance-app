import { isNullish } from '@dfinity/utils';

import { hasComplexFollowing } from '@features/voting/utils/topicFollowing';

import { useGovernanceNeurons } from '@hooks/governance';
import { useNnsDappAccount } from '@hooks/nnsDapp/useNnsDappAccount';
import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';
import { isWebHidSupported } from '@common/ledger/webhid';

type DetectionResult = {
  isDetecting: boolean;
  detectedFeatures: Partial<AdvancedFeaturesSettings>;
  error: unknown;
};

/**
 * Detects which of the given features the user already uses, from the NNS dapp account and the
 * neurons. An empty list makes the hook inert (isDetecting = false).
 */
export const useDetectAdvancedFeatures = (
  featureKeys: readonly AdvancedFeature[],
): DetectionResult => {
  const hasFeaturesToCheck = featureKeys.length > 0;
  const shouldCheckSubaccounts = featureKeys.includes(AdvancedFeature.Subaccounts);
  const shouldCheckAdvancedFollowing = featureKeys.includes(AdvancedFeature.AdvancedFollowing);
  // A device account is only useful where WebHID can reach the device.
  const shouldCheckLedgerDevice =
    featureKeys.includes(AdvancedFeature.LedgerDevice) && isWebHidSupported();
  const shouldCheckNnsDappAccount = shouldCheckSubaccounts || shouldCheckLedgerDevice;

  const nnsDappAccount = useNnsDappAccount(hasFeaturesToCheck && shouldCheckNnsDappAccount);
  const neuronsQuery = useGovernanceNeurons({
    enabled: hasFeaturesToCheck && shouldCheckAdvancedFollowing,
  });

  const isPending =
    (shouldCheckNnsDappAccount && nnsDappAccount.isLoading) ||
    (shouldCheckAdvancedFollowing && neuronsQuery.isLoading);

  const detectedFeatures: Partial<AdvancedFeaturesSettings> = {};
  if (hasFeaturesToCheck && !isPending) {
    const accountData = nnsDappAccount.data?.response;
    if (shouldCheckSubaccounts) {
      detectedFeatures[AdvancedFeature.Subaccounts] = isNullish(accountData)
        ? false
        : accountData.sub_accounts.length > 0;
    }

    if (shouldCheckLedgerDevice) {
      detectedFeatures[AdvancedFeature.LedgerDevice] = isNullish(accountData)
        ? false
        : accountData.hardware_wallet_accounts.length > 0;
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
