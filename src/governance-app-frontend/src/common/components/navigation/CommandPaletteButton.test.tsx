import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeCommandPalette, registerCommandPalette } from '@hooks/useCommandPaletteOpen';

import { CommandPaletteButton } from './CommandPaletteButton';

const mocks = vi.hoisted(() => ({ enabled: true, openCommandPalette: vi.fn() }));

vi.mock('@hooks/useCommandPaletteSettings', () => ({
  useCommandPaletteSettings: () => ({ enabled: mocks.enabled }),
}));
vi.mock('@hooks/useCommandPaletteOpen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hooks/useCommandPaletteOpen')>()),
  openCommandPalette: mocks.openCommandPalette,
}));

describe('CommandPaletteButton', () => {
  let unregisterPalette: () => void;

  beforeEach(() => {
    mocks.enabled = true;
    unregisterPalette = registerCommandPalette();
  });

  afterEach(() => {
    unregisterPalette();
    closeCommandPalette();
    vi.clearAllMocks();
  });

  it('opens the palette from the sidebar.', async () => {
    render(<CommandPaletteButton variant="sidebar" collapsed={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Search/ }));

    expect(mocks.openCommandPalette).toHaveBeenCalledExactlyOnceWith('sidebar');
  });

  it('shows the label and the shortcut in the expanded sidebar.', () => {
    render(<CommandPaletteButton variant="sidebar" collapsed={false} />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Search');
    expect(button.textContent).toContain('K');
  });

  it('shows only the icon in the collapsed sidebar.', () => {
    render(<CommandPaletteButton variant="sidebar" collapsed />);

    const button = screen.getByRole('button', { name: 'Search' });
    expect(button.textContent).toBe('');
  });

  it('opens the palette from the mobile header.', async () => {
    render(<CommandPaletteButton variant="header" />);

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(mocks.openCommandPalette).toHaveBeenCalledExactlyOnceWith('mobile_header');
  });

  it('calls the onClick of the parent too.', async () => {
    const onClick = vi.fn();
    render(<CommandPaletteButton variant="header" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(mocks.openCommandPalette).toHaveBeenCalledOnce();
  });

  it('renders nothing while the palette is off.', () => {
    mocks.enabled = false;
    const { container } = render(<CommandPaletteButton variant="header" />);

    expect(container.childElementCount).toBe(0);
  });

  it('renders nothing on a screen without a palette.', () => {
    unregisterPalette();
    unregisterPalette = () => {};
    const { container } = render(<CommandPaletteButton variant="header" />);

    expect(container.childElementCount).toBe(0);
  });
});
