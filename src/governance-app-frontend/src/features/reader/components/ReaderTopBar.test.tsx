import '@/i18n/config';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReaderTopBar } from './ReaderTopBar';

const { login, setLoginSource } = vi.hoisted(() => ({
  login: vi.fn(),
  setLoginSource: vi.fn(),
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ canLogin: true, isLoggingIn: false, login }),
}));

vi.mock('@features/analytics/useLoginAnalytics', () => ({ setLoginSource }));

describe('ReaderTopBar', () => {
  it('shows the logo and starts the login from the top bar', () => {
    render(<ReaderTopBar />);

    expect(screen.getByRole('img', { name: 'Internet Computer (ICP) Logo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(setLoginSource).toHaveBeenCalledWith('reader_top_bar');
    expect(login).toHaveBeenCalledTimes(1);
  });
});
