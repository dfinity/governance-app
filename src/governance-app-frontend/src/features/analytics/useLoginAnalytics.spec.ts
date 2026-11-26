import type { Identity } from '@icp-sdk/core/agent';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsEvent } from '@features/analytics/events';
import { analytics } from '@features/analytics/service';

import { useLoginAnalytics } from './useLoginAnalytics';

const { auth } = vi.hoisted(() => ({
  auth: { isLoggingIn: false, identity: undefined as Identity | undefined },
}));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ isLoggingIn: auth.isLoggingIn, identity: auth.identity }),
}));

const IDENTITY = {} as Identity;

const renderLoginPage = () => {
  const hook = renderHook(() => useLoginAnalytics());
  return (next: { isLoggingIn: boolean; identity?: Identity }) => {
    auth.isLoggingIn = next.isLoggingIn;
    auth.identity = next.identity;
    hook.rerender();
  };
};

describe('useLoginAnalytics', () => {
  beforeEach(() => {
    auth.isLoggingIn = false;
    auth.identity = undefined;
    vi.spyOn(analytics, 'init').mockClear();
    vi.spyOn(analytics, 'event').mockClear();
  });

  it('starts the tracker', () => {
    renderLoginPage();

    expect(analytics.init).toHaveBeenCalledOnce();
  });

  it('sends login_success when the login ends with an identity', () => {
    const setAuth = renderLoginPage();

    setAuth({ isLoggingIn: true });
    setAuth({ isLoggingIn: false, identity: IDENTITY });

    expect(analytics.event).toHaveBeenLastCalledWith(AnalyticsEvent.LoginSuccess);
  });

  it('sends login_error when the login ends without an identity', () => {
    const setAuth = renderLoginPage();

    setAuth({ isLoggingIn: true });
    setAuth({ isLoggingIn: false });

    expect(analytics.event).toHaveBeenLastCalledWith(AnalyticsEvent.LoginError);
  });

  it('sends login_start when a login begins, also for a login that never ends', () => {
    const setAuth = renderLoginPage();

    setAuth({ isLoggingIn: true });
    // A second click during the login starts it again, and is not a new attempt.
    setAuth({ isLoggingIn: true });

    expect(analytics.event).toHaveBeenCalledExactlyOnceWith(AnalyticsEvent.LoginStart);
  });

  it('sends no login_start for a login that runs at mount', () => {
    auth.isLoggingIn = true;
    renderLoginPage();

    expect(analytics.event).not.toHaveBeenCalled();
  });

  it('sends a start and a result for each login attempt', () => {
    const setAuth = renderLoginPage();

    setAuth({ isLoggingIn: true });
    setAuth({ isLoggingIn: false });
    setAuth({ isLoggingIn: false });
    setAuth({ isLoggingIn: true });
    setAuth({ isLoggingIn: false, identity: IDENTITY });

    expect(vi.mocked(analytics.event).mock.calls.map(([name]) => name)).toEqual([
      AnalyticsEvent.LoginStart,
      AnalyticsEvent.LoginError,
      AnalyticsEvent.LoginStart,
      AnalyticsEvent.LoginSuccess,
    ]);
  });

  it('does not send an event without a login attempt', () => {
    const setAuth = renderLoginPage();

    // A session restored from storage.
    setAuth({ isLoggingIn: false, identity: IDENTITY });

    expect(analytics.event).not.toHaveBeenCalled();
  });
});
