import { useEffect, useRef, useState } from 'react';

import type { GetAccountResponse } from '@declarations/nns-dapp/nns-dapp.did';

import { useNnsDapp } from '@hooks/nnsDapp/useNnsDapp';
import { useAdvancedFeatures } from '@hooks/useAdvancedFeatures';
import { AdvancedFeature, type AdvancedFeaturesSettings } from '@typings/advancedFeatures';

type DetectionResult = {
  isDetecting: boolean;
  detectedFeatures: Partial<AdvancedFeaturesSettings>;
  error: unknown;
};

function detectSubaccounts(res: GetAccountResponse): boolean {
  return 'Ok' in res && res.Ok.sub_accounts.length > 0;
}

/**
 * Orchestrator hook for detecting advanced features.
 * Automatically determines which features need checking by comparing
 * the feature registry against what's already stored in localStorage.
 *
 * @param enabled - When false, the hook is inert (no canister calls, isDetecting = false).
 */
export const useDetectAdvancedFeatures = (enabled = true): DetectionResult => {
  const { ready, authenticated, canister } = useNnsDapp();
  const { missingFeatureKeys } = useAdvancedFeatures();
  const hasRun = useRef(false);

  const shouldCheckSubaccounts = missingFeatureKeys.includes(AdvancedFeature.Subaccounts);
  const hasFeaturesToCheck = enabled && missingFeatureKeys.length > 0;

  const [result, setResult] = useState<DetectionResult>({
    isDetecting: hasFeaturesToCheck,
    detectedFeatures: {},
    error: undefined,
  });

  useEffect(() => {
    if (!hasFeaturesToCheck || !ready || !authenticated || hasRun.current) return;
    hasRun.current = true;

    const detect = async () => {
      try {
        const detected: Partial<AdvancedFeaturesSettings> = {};

        if (shouldCheckSubaccounts) {
          detected[AdvancedFeature.Subaccounts] = detectSubaccounts(
            await canister!.service.get_account(),
          );
        }

        setResult({ isDetecting: false, detectedFeatures: detected, error: undefined });
      } catch (error) {
        setResult({ isDetecting: false, detectedFeatures: {}, error });
      }
    };

    detect();
  }, [ready, authenticated, canister, hasFeaturesToCheck, shouldCheckSubaccounts]);

  return result;
};
