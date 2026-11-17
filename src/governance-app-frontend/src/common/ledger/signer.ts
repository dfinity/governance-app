import type { NeuronInfo } from '@icp-sdk/canisters/nns';

/**
 * Who signs a controller-only neuron action.
 *
 * `ii` is the Internet Identity session. `ledger` is a registered Ledger device, named by
 * its principal. The canister factories in `@common/canisters` accept a signer and pick
 * the matching agent.
 */
export type Signer = { kind: 'ii' } | { kind: 'ledger'; principal: string };

export const II_SIGNER: Signer = { kind: 'ii' };

/** True when the neuron controller is one of the registered Ledger device principals. */
export const isNeuronControlledByLedger = ({
  neuron,
  ledgerPrincipals,
}: {
  neuron: NeuronInfo;
  ledgerPrincipals: readonly string[];
}): boolean => {
  const controller = neuron.fullNeuron?.controller;

  return !!controller && ledgerPrincipals.includes(controller);
};

/**
 * The signer that can run a controller-only action on the neuron.
 *
 * Returns `ii` when the Internet Identity principal is the controller, `ledger` when the
 * controller is a registered device principal, and `undefined` when neither is true (for
 * example a hotkey-only neuron). Actions that a hotkey can sign (vote, follow, refresh
 * voting power) do not need this resolver; they keep the Internet Identity session.
 */
export const resolveNeuronSigner = ({
  neuron,
  iiPrincipal,
  ledgerPrincipals,
}: {
  neuron: NeuronInfo;
  iiPrincipal?: string | null;
  ledgerPrincipals: readonly string[];
}): Signer | undefined => {
  const controller = neuron.fullNeuron?.controller;

  if (!controller) return undefined;
  if (controller === iiPrincipal) return II_SIGNER;
  if (ledgerPrincipals.includes(controller)) return { kind: 'ledger', principal: controller };

  return undefined;
};
