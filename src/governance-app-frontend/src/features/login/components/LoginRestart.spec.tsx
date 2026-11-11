import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginRestart } from './LoginRestart';

const renderPrompt = (isFinishing: boolean) =>
  render(<LoginRestart onRestart={vi.fn()} isFinishing={isFinishing} />);

const promptClasses = () => screen.getByTestId('login-restart-btn').parentElement?.className;

describe('LoginRestart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the prompt after the delay.', () => {
    renderPrompt(false);
    expect(promptClasses()).toContain('invisible');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(promptClasses()).not.toContain('invisible');
  });

  it('keeps the prompt hidden once Internet Identity answered.', () => {
    renderPrompt(true);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(promptClasses()).toContain('invisible');
  });
});
