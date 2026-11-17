import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIconMotion } from './useIconMotion';

const Row = () => <a href="/" {...useIconMotion()} />;

const renderRow = () => {
  render(<Row />);
  return screen.getByRole('link');
};

const mockAnimation = (row: HTMLElement) => {
  const { promise, resolve } = Promise.withResolvers<void>();
  row.getAnimations = () => [{ finished: promise } as unknown as Animation];
  return resolve;
};

describe('useIconMotion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays after the pointer rests on the row', () => {
    const row = renderRow();
    mockAnimation(row);

    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    expect(row.hasAttribute('data-icon-play')).toBe(false);

    act(() => vi.advanceTimersByTime(150));
    expect(row.hasAttribute('data-icon-play')).toBe(true);
  });

  it('does not play when the pointer only crosses the row', () => {
    const row = renderRow();

    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerLeave(row, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(150));

    expect(row.hasAttribute('data-icon-play')).toBe(false);
  });

  it('does not play on touch', () => {
    const row = renderRow();

    fireEvent.pointerEnter(row, { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(150));

    expect(row.hasAttribute('data-icon-play')).toBe(false);
  });

  it('keeps the motion until it ends, even when the pointer leaves', async () => {
    const row = renderRow();
    const finish = mockAnimation(row);

    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.pointerLeave(row, { pointerType: 'mouse' });
    expect(row.hasAttribute('data-icon-play')).toBe(true);

    await act(async () => finish());
    expect(row.hasAttribute('data-icon-play')).toBe(false);
  });

  it('does not restart a motion that still plays', () => {
    const row = renderRow();
    mockAnimation(row);
    const setAttribute = vi.spyOn(row, 'setAttribute');

    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.pointerLeave(row, { pointerType: 'mouse' });
    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(150));

    expect(setAttribute).toHaveBeenCalledTimes(1);
  });

  it('does not play after the row unmounts', () => {
    const { unmount } = render(<Row />);
    const row = screen.getByRole('link');

    fireEvent.pointerEnter(row, { pointerType: 'mouse' });
    unmount();
    act(() => vi.advanceTimersByTime(150));

    expect(row.hasAttribute('data-icon-play')).toBe(false);
  });
});
