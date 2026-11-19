import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RootError } from './RootError';

const { reloadPage } = vi.hoisted(() => ({ reloadPage: vi.fn() }));
vi.mock('@utils/page', () => ({ reloadPage }));

describe('RootError', () => {
  beforeEach(() => {
    reloadPage.mockClear();
  });

  it('names the error and reloads the page on request.', () => {
    render(<RootError error={new Error('boom')} reset={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeDefined();
    expect(
      screen.getByText('The page could not load. Reload the page to try again.'),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('explains a denied storage.', () => {
    const error = new DOMException('Access is denied for this document.', 'SecurityError');
    render(<RootError error={error} reset={() => undefined} />);

    expect(screen.getByText(/blocks this site from saving data/)).toBeDefined();
  });
});
