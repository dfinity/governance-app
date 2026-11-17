import { act, fireEvent, render, screen } from '@testing-library/react';
import { Command } from 'cmdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NO_RESULT_DELAY_MS } from '@features/analytics/commandPaletteSearch';
import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { CommandPaletteNoResultTracker } from './CommandPaletteNoResultTracker';

vi.mock('@features/analytics/service', () => ({ analytics: { event: vi.fn() } }));

const renderPalette = () =>
  render(
    <Command>
      <Command.Input />
      <Command.List>
        <Command.Item value="stake">Stake ICP</Command.Item>
      </Command.List>
      <CommandPaletteNoResultTracker />
    </Command>,
  );

const search = (query: string) =>
  act(() => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: query } });
  });

describe('CommandPaletteNoResultTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('does not report a search with results.', () => {
    renderPalette();

    search('stake');
    act(() => vi.advanceTimersByTime(NO_RESULT_DELAY_MS));

    expect(analytics.event).not.toHaveBeenCalled();
  });

  it('reports the pending search when the palette closes.', () => {
    const { unmount } = renderPalette();

    search('send 5 icp');
    unmount();

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.CommandPaletteNoResult, {
      query: 'send # icp',
    });
  });
});
