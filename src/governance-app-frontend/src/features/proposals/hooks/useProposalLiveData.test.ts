import { ProposalInfo } from '@icp-sdk/canisters/nns';
import { describe, expect, it } from 'vitest';

import { FINAL_READ_MARGIN_SECONDS, isFinalProposalRead } from './useProposalLiveData';

const DEADLINE = 2_000_000;

const read = (startedAtSeconds: number, deadline = DEADLINE) => ({
  proposal: { deadlineTimestampSeconds: BigInt(deadline) } as ProposalInfo,
  startedAtSeconds,
});

describe('isFinalProposalRead', () => {
  it('is false without a read', () => {
    expect(isFinalProposalRead({ read: undefined, baseDeadlineSeconds: DEADLINE })).toBe(false);
  });

  it('is false for a read that started before the deadline, however late it arrived', () => {
    expect(isFinalProposalRead({ read: read(DEADLINE - 1), baseDeadlineSeconds: DEADLINE })).toBe(
      false,
    );
  });

  it('is false for a read that started inside the margin after the deadline', () => {
    expect(
      isFinalProposalRead({
        read: read(DEADLINE + FINAL_READ_MARGIN_SECONDS),
        baseDeadlineSeconds: DEADLINE,
      }),
    ).toBe(false);
  });

  it('is true for a read that started after the deadline and the margin', () => {
    expect(
      isFinalProposalRead({
        read: read(DEADLINE + FINAL_READ_MARGIN_SECONDS + 1),
        baseDeadlineSeconds: DEADLINE,
      }),
    ).toBe(true);
  });

  it('follows a deadline that the read extended', () => {
    const extended = DEADLINE + 86_400;
    expect(
      isFinalProposalRead({
        read: read(DEADLINE + FINAL_READ_MARGIN_SECONDS + 1, extended),
        baseDeadlineSeconds: DEADLINE,
      }),
    ).toBe(false);
  });

  it('keeps the base deadline when the proposal is missing from the read', () => {
    expect(
      isFinalProposalRead({
        read: { proposal: null, startedAtSeconds: DEADLINE - 1 },
        baseDeadlineSeconds: DEADLINE,
      }),
    ).toBe(false);
  });
});
