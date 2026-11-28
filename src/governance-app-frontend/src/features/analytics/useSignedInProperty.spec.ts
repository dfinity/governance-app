import type { Identity } from '@icp-sdk/core/agent';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from '@features/analytics/service';

import { useSignedInProperty } from './useSignedInProperty';

const { auth } = vi.hoisted(() => ({ auth: { identity: undefined as Identity | undefined } }));

vi.mock('@hooks/useInternetIdentity', () => ({
  useInternetIdentity: () => ({ identity: auth.identity }),
}));

describe('useSignedInProperty', () => {
  beforeEach(() => {
    auth.identity = undefined;
    vi.spyOn(analytics, 'setProperties').mockClear();
  });

  it('follows the session', () => {
    const hook = renderHook(() => useSignedInProperty());
    expect(analytics.setProperties).toHaveBeenLastCalledWith({ signed_in: 'no' });

    auth.identity = {} as Identity;
    hook.rerender();
    expect(analytics.setProperties).toHaveBeenLastCalledWith({ signed_in: 'yes' });
  });
});
