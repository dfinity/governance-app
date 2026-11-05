import { AccountIdentifier, SubAccount } from '@icp-sdk/canisters/ledger/icp';
import { memoToNeuronSubaccount } from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';
import { describe, expect, it } from 'vitest';

import { CANISTER_ID_NNS_GOVERNANCE } from '@constants/canisterIds';

import {
  createStakeMemo,
  DeviceApprovalStep,
  getDeviceApprovalSteps,
  getStakeAccountIdentifier,
} from './ledgerStake';

const CONTROLLER = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

describe('createStakeMemo', () => {
  it('returns a random 64-bit memo', () => {
    const memos = new Set([createStakeMemo(), createStakeMemo(), createStakeMemo()]);

    expect(memos.size).toBe(3);
    memos.forEach((memo) => {
      expect(memo >= 0n).toBe(true);
      expect(memo < 2n ** 64n).toBe(true);
    });
  });
});

describe('getStakeAccountIdentifier', () => {
  it('derives the governance account from the controller and the memo, like stakeNeuron', () => {
    const memo = 123_456_789n;
    const subAccount = SubAccount.fromBytes(
      memoToNeuronSubaccount({ controller: CONTROLLER, memo }).toUint8Array(),
    ) as SubAccount;
    const expected = AccountIdentifier.fromPrincipal({
      principal: Principal.fromText(CANISTER_ID_NNS_GOVERNANCE!),
      subAccount,
    });

    expect(getStakeAccountIdentifier({ controller: CONTROLLER, memo }).toHex()).toBe(
      expected.toHex(),
    );
  });

  it('changes with the memo', () => {
    const first = getStakeAccountIdentifier({ controller: CONTROLLER, memo: 1n }).toHex();
    const second = getStakeAccountIdentifier({ controller: CONTROLLER, memo: 2n }).toHex();

    expect(first).not.toBe(second);
  });
});

describe('getDeviceApprovalSteps', () => {
  it('always needs the transfer, the hotkey and the dissolve delay', () => {
    expect(getDeviceApprovalSteps({ autoStakeMaturity: false, startDissolving: false })).toEqual([
      DeviceApprovalStep.Transfer,
      DeviceApprovalStep.Hotkey,
      DeviceApprovalStep.DissolveDelay,
    ]);
  });

  it('adds one approval per selected controller step, in the order of the wizard', () => {
    expect(getDeviceApprovalSteps({ autoStakeMaturity: true, startDissolving: true })).toEqual([
      DeviceApprovalStep.Transfer,
      DeviceApprovalStep.Hotkey,
      DeviceApprovalStep.DissolveDelay,
      DeviceApprovalStep.AutoStake,
      DeviceApprovalStep.StartDissolving,
    ]);
    expect(getDeviceApprovalSteps({ autoStakeMaturity: false, startDissolving: true })).toEqual([
      DeviceApprovalStep.Transfer,
      DeviceApprovalStep.Hotkey,
      DeviceApprovalStep.DissolveDelay,
      DeviceApprovalStep.StartDissolving,
    ]);
  });
});
