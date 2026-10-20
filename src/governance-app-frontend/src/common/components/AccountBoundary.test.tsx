import type { Identity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { session } = vi.hoisted(() => ({
  session: { identity: undefined as Identity | undefined },
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: session.identity }),
}));

const { AccountBoundary } = await import('./AccountBoundary');

// Stands for an open dialog with data that the user entered.
const Draft = () => {
  const [amount, setAmount] = useState('');

  return (
    <input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
  );
};

const renderDraft = (identity: Identity) => {
  session.identity = identity;
  const view = render(
    <AccountBoundary>
      <Draft />
    </AccountBoundary>,
  );
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5' } });

  return (next: Identity) => {
    session.identity = next;
    view.rerender(
      <AccountBoundary>
        <Draft />
      </AccountBoundary>,
    );
  };
};

describe('AccountBoundary', () => {
  it('discards the data of the account before when the account changes.', () => {
    const switchTo = renderDraft(Ed25519KeyIdentity.generate());

    switchTo(Ed25519KeyIdentity.generate());

    expect(screen.getByLabelText('Amount')).toHaveProperty('value', '');
  });

  it('keeps the data when the same account gets a new identity object.', () => {
    const identity = Ed25519KeyIdentity.generate();
    const switchTo = renderDraft(identity);

    switchTo(Ed25519KeyIdentity.fromSecretKey(identity.getKeyPair().secretKey));

    expect(screen.getByLabelText('Amount')).toHaveProperty('value', '5');
  });
});
