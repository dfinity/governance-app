import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  E8S,
  MATURITY_DISBURSEMENT_DELAY_SECONDS,
  MILLISECONDS_IN_SECOND,
  SECONDS_IN_DAY,
} from '@constants/extra';
import { secondsToDate } from '@utils/date';
import { mockDisbursement, mockNeuron } from '@fixtures/neuron';

import { NeuronDetailDisbursementsView } from './NeuronDetailDisbursementsView';

// ─── Module mocks ────────────────────────────────────────────────

const OWNER = Principal.fromText('aaaaa-aa');
const MAIN_ACCOUNT_ID = AccountIdentifier.fromPrincipal({ principal: OWNER }).toHex();

vi.mock('@features/accounts/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: {
      mainAccountId: MAIN_ACCOUNT_ID,
      accounts: [{ accountId: MAIN_ACCOUNT_ID, name: 'Main account' }],
    },
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────

const START = 1_700_000_000n;
const OTHER_ACCOUNT_ID = 'b'.repeat(64);

const setNow = (seconds: bigint) => {
  vi.useFakeTimers();
  vi.setSystemTime(Number(seconds) * MILLISECONDS_IN_SECOND);
};

const renderView = (disbursements: ReturnType<typeof mockDisbursement>[]) =>
  render(
    <NeuronDetailDisbursementsView
      neuron={mockNeuron({ fullNeuron: { maturityDisbursementsInProgress: disbursements } })}
    />,
  );

describe('NeuronDetailDisbursementsView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the total maturity disbursing', () => {
    renderView([
      mockDisbursement({ amountE8s: BigInt(2 * E8S) }),
      mockDisbursement({ amountE8s: BigInt(3 * E8S) }),
    ]);

    expect(screen.getByTestId('disbursements-total').textContent).toContain('5.00');
    expect(screen.getAllByTestId('disbursement-entry')).toHaveLength(2);
  });

  it('shows the amount, start date and completion date of an entry', () => {
    renderView([
      mockDisbursement({
        amountE8s: BigInt(2 * E8S),
        timestampOfDisbursementSeconds: START,
        accountIdentifierToDisburseTo: OTHER_ACCOUNT_ID,
      }),
    ]);

    expect(screen.getByTestId('disbursement-amount').textContent).toContain('2.00');
    expect(screen.getByTestId('disbursement-started').textContent).toBe(
      secondsToDate(Number(START)),
    );
    expect(screen.getByTestId('disbursement-completes').textContent).toBe(
      secondsToDate(Number(START) + MATURITY_DISBURSEMENT_DELAY_SECONDS),
    );
  });

  it('prefers the finalize timestamp reported by the canister', () => {
    const finalize = START + 100n;
    renderView([
      mockDisbursement({
        timestampOfDisbursementSeconds: START,
        finalizeDisbursementTimestampSeconds: finalize,
      }),
    ]);

    expect(screen.getByTestId('disbursement-completes').textContent).toBe(
      secondsToDate(Number(finalize)),
    );
  });

  it('counts down the time left until the ICP arrives', () => {
    const elapsed = SECONDS_IN_DAY + 2 * 60 * 60 + 3 * 60 + 4;
    setNow(START + BigInt(elapsed));
    renderView([mockDisbursement({ timestampOfDisbursementSeconds: START })]);

    expect(screen.getByTestId('disbursement-countdown-days').textContent).toBe('05');
    expect(screen.getByTestId('disbursement-countdown-hours').textContent).toBe('21');
    expect(screen.getByTestId('disbursement-countdown-minutes').textContent).toBe('56');
    expect(screen.getByTestId('disbursement-countdown-seconds').textContent).toBe('56');
    expect(screen.getByTestId('disbursement-progress').getAttribute('aria-valuenow')).toBe(
      String(Math.round((elapsed / MATURITY_DISBURSEMENT_DELAY_SECONDS) * 100)),
    );

    act(() => {
      vi.advanceTimersByTime(MILLISECONDS_IN_SECOND);
    });

    expect(screen.getByTestId('disbursement-countdown-seconds').textContent).toBe('55');
  });

  it('shows the finalizing state after the completion time', () => {
    setNow(START + BigInt(MATURITY_DISBURSEMENT_DELAY_SECONDS) + 60n);
    renderView([mockDisbursement({ timestampOfDisbursementSeconds: START })]);

    expect(screen.getByTestId('disbursement-finalizing')).toBeTruthy();
    expect(screen.queryByTestId('disbursement-countdown')).toBeNull();
    expect(screen.getByTestId('disbursement-progress').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows the account name when the destination is one of the user accounts', () => {
    renderView([mockDisbursement({ accountIdentifierToDisburseTo: MAIN_ACCOUNT_ID })]);

    expect(screen.getByTestId('disbursement-destination').textContent).toBe('Main account');
  });

  it('shows the account name for an ICRC-1 destination that is one of the user accounts', () => {
    renderView([
      mockDisbursement({ accountToDisburseTo: { owner: OWNER, subaccount: undefined } }),
    ]);

    const destination = screen.getByTestId('disbursement-destination');
    expect(destination.textContent).toBe('Main account');
    expect(destination.getAttribute('title')).toBe(OWNER.toText());
  });

  it('shortens an unknown destination and keeps the full value as title', () => {
    renderView([mockDisbursement({ accountIdentifierToDisburseTo: OTHER_ACCOUNT_ID })]);

    const destination = screen.getByTestId('disbursement-destination');
    expect(destination.textContent).toBe(`${'b'.repeat(8)}...${'b'.repeat(8)}`);
    expect(destination.getAttribute('title')).toBe(OTHER_ACCOUNT_ID);
  });

  it('shows no destination title, countdown or dates when the canister reports nothing', () => {
    renderView([mockDisbursement()]);

    expect(screen.getByTestId('disbursement-destination').getAttribute('title')).toBeNull();
    expect(screen.queryByTestId('disbursement-countdown')).toBeNull();
    expect(screen.queryByTestId('disbursement-progress')).toBeNull();
    expect(screen.getByTestId('disbursement-started').textContent).toBe('-');
    expect(screen.getByTestId('disbursement-completes').textContent).toBe('-');
  });
});
