import { act, fireEvent, render, screen } from '@testing-library/react';
import { Command } from 'cmdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NO_RESULT_DELAY_MS } from '@features/analytics/commandPaletteSearch';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { CommandPaletteNoResultTracker } from './CommandPaletteNoResultTracker';

const mocks = vi.hoisted(() => ({ privateNames: [] as string[] }));

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));
vi.mock('@features/analytics/usePrivateNames', () => ({
  usePrivateNames: () => mocks.privateNames,
}));

const Palette = ({ open = true }: { open?: boolean }) => (
  <Command>
    <Command.Input />
    <Command.List>
      <Command.Item value="stake">Stake ICP</Command.Item>
    </Command.List>
    <CommandPaletteNoResultTracker open={open} />
  </Command>
);

const renderPalette = () => render(<Palette />);

const search = (query: string) =>
  act(() => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: query } });
  });

describe('CommandPaletteNoResultTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.privateNames = [];
    vi.useFakeTimers();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a search with no result after a pause in typing.', () => {
    renderPalette();

    search('exp');
    search('export');
    act(() => vi.advanceTimersByTime(NO_RESULT_DELAY_MS));

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteNoResult, {
      query: 'export',
    });
  });

  it('masks the names that the user gave.', () => {
    mocks.privateNames = ['Alice Smith'];
    renderPalette();

    search('export alice');
    act(() => vi.advanceTimersByTime(NO_RESULT_DELAY_MS));

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteNoResult, {
      query: 'export *',
    });
  });

  it('does not report a search with results.', () => {
    renderPalette();

    search('stake');
    act(() => vi.advanceTimersByTime(NO_RESULT_DELAY_MS));

    expect(analytics.event).not.toHaveBeenCalled();
  });

  it('does not report a search that the user clears.', () => {
    renderPalette();

    search('export');
    search('');
    act(() => vi.advanceTimersByTime(NO_RESULT_DELAY_MS));

    expect(analytics.event).not.toHaveBeenCalled();
  });

  it('reports the pending search when the palette closes.', () => {
    const { rerender } = renderPalette();

    search('send 5 icp');
    rerender(<Palette open={false} />);
    search('');

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteNoResult, {
      query: 'send # icp',
    });
  });

  it('reports the pending search when the palette unmounts.', () => {
    const { unmount } = renderPalette();

    search('send 5 icp');
    unmount();

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteNoResult, {
      query: 'send # icp',
    });
  });
});
