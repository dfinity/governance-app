import '@/i18n/config';

import { act, render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SENSITIVE_PLACEHOLDER, SensitiveValue } from '@components/SensitiveValue';
import { installDomTranslationGuard } from '@utils/domTranslationGuard';

const store = vi.hoisted(() => {
  let hidden = false;
  const listeners = new Set<() => void>();
  return {
    get: () => hidden,
    set: (value: boolean) => {
      hidden = value;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});
vi.mock('@hooks/useHideBalances', () => ({
  useHideBalances: () => ({
    hidden: useSyncExternalStore(store.subscribe, store.get),
    setHidden: store.set,
  }),
}));

// Google Translate replaces each text node with a <font> that holds the translated copy.
const translate = (root: Node) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  textNodes.forEach((node) => {
    const font = document.createElement('font');
    font.textContent = node.textContent;
    node.parentNode?.replaceChild(font, node);
  });
};

const Amount = () => (
  <p data-testid="amount">
    <SensitiveValue>
      {'$'}
      {10}
    </SensitiveValue>
  </p>
);

describe('SensitiveValue', () => {
  const nativeInsertBefore = Node.prototype.insertBefore;
  const nativeRemoveChild = Node.prototype.removeChild;

  beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    installDomTranslationGuard();
  });

  afterAll(() => {
    Node.prototype.insertBefore = nativeInsertBefore;
    Node.prototype.removeChild = nativeRemoveChild;
    vi.restoreAllMocks();
  });

  it('shows the value when balances are visible', () => {
    store.set(false);
    const { getByTestId } = render(<Amount />);

    expect(getByTestId('amount').textContent).toBe('$10');
  });

  it('shows the placeholder when balances are hidden', () => {
    store.set(true);
    const { getByTestId } = render(<Amount />);

    expect(getByTestId('amount').textContent).toBe(SENSITIVE_PLACEHOLDER.md);
  });

  it('does not duplicate the value when a translator rewrote the text', () => {
    store.set(false);
    const { getByTestId } = render(<Amount />);
    const amount = getByTestId('amount');

    translate(amount);
    act(() => store.set(true));
    expect(amount.textContent).toBe(SENSITIVE_PLACEHOLDER.md);

    translate(amount);
    act(() => store.set(false));
    expect(amount.textContent).toBe('$10');

    translate(amount);
    act(() => store.set(true));
    expect(amount.textContent).toBe(SENSITIVE_PLACEHOLDER.md);
  });
});
