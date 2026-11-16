import { describe, expect, it } from 'vitest';

import { mockNeuron } from '@fixtures/neuron';

import { isNeuronControlledByLedger, resolveNeuronSigner } from './signer';

const II_PRINCIPAL = 'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe';
const DEVICE_PRINCIPAL = '2vxsx-fae';
const OTHER_PRINCIPAL = 'rrkah-fqaaa-aaaaa-aaaaq-cai';

const neuronWith = (controller: string | undefined, hotKeys: string[] = []) =>
  mockNeuron({ fullNeuron: { controller, hotKeys } });

describe('resolveNeuronSigner', () => {
  it('returns the II signer when the II principal is the controller', () => {
    expect(
      resolveNeuronSigner({
        neuron: neuronWith(II_PRINCIPAL),
        iiPrincipal: II_PRINCIPAL,
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toEqual({ kind: 'ii' });
  });

  it('returns the Ledger signer when a registered device is the controller', () => {
    expect(
      resolveNeuronSigner({
        neuron: neuronWith(DEVICE_PRINCIPAL, [II_PRINCIPAL]),
        iiPrincipal: II_PRINCIPAL,
        ledgerPrincipals: [OTHER_PRINCIPAL, DEVICE_PRINCIPAL],
      }),
    ).toEqual({ kind: 'ledger', principal: DEVICE_PRINCIPAL });
  });

  it('prefers the II signer when the II principal is also a registered device', () => {
    expect(
      resolveNeuronSigner({
        neuron: neuronWith(II_PRINCIPAL),
        iiPrincipal: II_PRINCIPAL,
        ledgerPrincipals: [II_PRINCIPAL],
      }),
    ).toEqual({ kind: 'ii' });
  });

  it('returns undefined for a hotkey-only neuron', () => {
    expect(
      resolveNeuronSigner({
        neuron: neuronWith(OTHER_PRINCIPAL, [II_PRINCIPAL]),
        iiPrincipal: II_PRINCIPAL,
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBeUndefined();
  });

  it('returns undefined when the neuron has no full neuron', () => {
    expect(
      resolveNeuronSigner({
        neuron: mockNeuron({ fullNeuron: undefined }),
        iiPrincipal: II_PRINCIPAL,
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBeUndefined();
  });

  it('returns undefined when there is no II principal and no device matches', () => {
    expect(
      resolveNeuronSigner({
        neuron: neuronWith(OTHER_PRINCIPAL),
        iiPrincipal: undefined,
        ledgerPrincipals: [],
      }),
    ).toBeUndefined();
  });
});

describe('isNeuronControlledByLedger', () => {
  it('is true when the controller is a registered device', () => {
    expect(
      isNeuronControlledByLedger({
        neuron: neuronWith(DEVICE_PRINCIPAL),
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBe(true);
  });

  it('is false when the controller is not a registered device', () => {
    expect(
      isNeuronControlledByLedger({
        neuron: neuronWith(II_PRINCIPAL),
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBe(false);
  });

  it('is false when the device is only a hotkey', () => {
    expect(
      isNeuronControlledByLedger({
        neuron: neuronWith(II_PRINCIPAL, [DEVICE_PRINCIPAL]),
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBe(false);
  });

  it('is false when the neuron has no full neuron', () => {
    expect(
      isNeuronControlledByLedger({
        neuron: mockNeuron({ fullNeuron: undefined }),
        ledgerPrincipals: [DEVICE_PRINCIPAL],
      }),
    ).toBe(false);
  });
});
