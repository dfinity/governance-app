import { describe, expect, it } from 'vitest';

import { firstComponentFromStack } from '@utils/error';

describe('firstComponentFromStack', () => {
  it('should return the first component name from a stack', () => {
    const stack = '\n    at Button\n    at Modal\n    at App';
    expect(firstComponentFromStack(stack)).toBe('Button');
  });

  it('should handle extra whitespace around component names', () => {
    const stack = '\n      at   MyComponent\n    at Parent';
    expect(firstComponentFromStack(stack)).toBe('MyComponent');
  });

  it('should return Unknown for an empty string', () => {
    expect(firstComponentFromStack('')).toBe('Unknown');
  });

  it('should return Unknown when no component is found', () => {
    expect(firstComponentFromStack('no match here')).toBe('Unknown');
  });
});
