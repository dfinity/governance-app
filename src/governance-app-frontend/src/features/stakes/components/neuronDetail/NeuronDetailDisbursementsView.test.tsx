import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { E8S, MATURITY_DISBURSEMENT_DELAY_SECONDS } from '@constants/extra';
import { formatTimestampToLocalDate } from '@utils/date';
import { mockDisbursement, mockNeuron } from '@fixtures/neuron';

import { NeuronDetailDisbursementsView } from './NeuronDetailDisbursementsView';

// ─── Module mocks ────────────────────────────────────────────────

const MAIN_ACCOUNT_ID = 'a'.repeat(64);

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

const renderView = (disbursements: ReturnType<typeof mockDisbursement>[]) =>
  render(
    <NeuronDetailDisbursementsView
      neuron={mockNeuron({ fullNeuron: { maturityDisbursementsInProgress: disbursements } })}
    />,
  );

describe('NeuronDetailDisbursementsView', () => {
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
      formatTimestampToLocalDate(START),
    );
    expect(screen.getByTestId('disbursement-completes').textContent).toBe(
      formatTimestampToLocalDate(START + BigInt(MATURITY_DISBURSEMENT_DELAY_SECONDS)),
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
      formatTimestampToLocalDate(finalize),
    );
  });

  it('shows the account name when the destination is one of the user accounts', () => {
    renderView([mockDisbursement({ accountIdentifierToDisburseTo: MAIN_ACCOUNT_ID })]);

    expect(screen.getByTestId('disbursement-destination').textContent).toBe('Main account');
  });

  it('shortens an unknown destination and keeps the full value as title', () => {
    renderView([mockDisbursement({ accountIdentifierToDisburseTo: OTHER_ACCOUNT_ID })]);

    const destination = screen.getByTestId('disbursement-destination');
    expect(destination.textContent).toBe(`${'b'.repeat(8)}...${'b'.repeat(8)}`);
    expect(destination.getAttribute('title')).toBe(OTHER_ACCOUNT_ID);
  });

  it('shows no destination title and a date placeholder when the canister reports nothing', () => {
    renderView([mockDisbursement()]);

    expect(screen.getByTestId('disbursement-destination').getAttribute('title')).toBeNull();
    expect(screen.getByTestId('disbursement-completes').textContent).toBe('-');
  });
});
