import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';

import { useInternetIdentity } from '@hooks/useInternetIdentity';
import { resolveNeuronSigner, type Signer } from '@common/ledger/signer';
import { isWebHidSupported } from '@common/ledger/webhid';

/**
 * The principals of the registered Ledger devices that this browser can ask to sign.
 * Empty when the `ledgerDevice` feature is off or the browser has no WebHID.
 */
export const useLedgerSignerPrincipals = (): string[] => {
  const { data: devices } = useHardwareWalletsMetadata();

  if (!isWebHidSupported()) return [];

  return devices.flatMap((device) => (device.principal ? [device.principal] : []));
};

/**
 * The signer that runs a controller-only action on the neuron: the Internet Identity session
 * when it is the controller, the registered Ledger device when it controls the neuron and this
 * browser can use it, and `undefined` otherwise (for example a hotkey-only neuron).
 */
export const useNeuronSigner = (neuron: NeuronInfo | null | undefined): Signer | undefined => {
  const { identity } = useInternetIdentity();
  const ledgerPrincipals = useLedgerSignerPrincipals();

  if (!neuron) return undefined;

  return resolveNeuronSigner({
    neuron,
    iiPrincipal: identity?.getPrincipal().toText(),
    ledgerPrincipals,
  });
};
