import type { NeuronInfo } from '@icp-sdk/canisters/nns';

import { useHardwareWalletsMetadata } from '@features/accounts/hooks/useHardwareWalletsMetadata';
import type { AccountMetadata } from '@features/accounts/types';

/**
 * The registered Ledger device that controls the neuron, or `undefined` when the controller
 * is not a registered device principal. Empty while the `ledgerDevice` feature is off.
 */
export type LedgerDevice = AccountMetadata & { principal: string };

export const useNeuronLedgerDevice = (neuron: NeuronInfo): LedgerDevice | undefined => {
  const { data: devices } = useHardwareWalletsMetadata();
  const controller = neuron.fullNeuron?.controller;

  if (!controller) return undefined;

  return devices.find((device): device is LedgerDevice => device.principal === controller);
};
