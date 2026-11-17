import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  isLoginHandoffActive,
  setLoginHandoffActive,
  useIsLoginHandoffActive,
} from './loginHandoff';

describe('loginHandoff', () => {
  afterEach(() => {
    setLoginHandoffActive(false);
  });

  it('tells its subscribers when the frame shows and leaves.', () => {
    const { result } = renderHook(() => useIsLoginHandoffActive());
    expect(result.current).toBe(false);

    act(() => setLoginHandoffActive(true));
    expect(result.current).toBe(true);
    expect(isLoginHandoffActive()).toBe(true);

    act(() => setLoginHandoffActive(false));
    expect(result.current).toBe(false);
  });
});
