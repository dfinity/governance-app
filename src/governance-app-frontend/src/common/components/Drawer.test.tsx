import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Drawer, DrawerContent, DrawerTitle } from './Drawer';

// The content unmounts after the exit animation, which jsdom never runs. `unmount` stands for it.
const renderOpenDrawer = () =>
  render(
    <Drawer open>
      <DrawerContent>
        <DrawerTitle>Drawer</DrawerTitle>
      </DrawerContent>
    </Drawer>,
  );

const setScrollY = (value: number) =>
  Object.defineProperty(window, 'scrollY', { value, configurable: true });

describe('Drawer', () => {
  beforeEach(() => {
    setScrollY(400);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    setScrollY(0);
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('freezes the scrolled document while it is open', () => {
    renderOpenDrawer();

    expect(document.body.style.getPropertyValue('position')).toBe('fixed');
    expect(document.body.style.getPropertyPriority('position')).toBe('important');
    expect(document.body.style.top).toBe('-400px');
  });

  it('restores the scroll position when its content unmounts', () => {
    const { unmount } = renderOpenDrawer();

    unmount();

    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'instant' });
  });

  it('leaves a document at the top as it is', () => {
    setScrollY(0);
    const { unmount } = renderOpenDrawer();

    expect(document.body.style.position).toBe('');

    unmount();

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the position of a new page when the page changes', () => {
    const { unmount } = renderOpenDrawer();

    window.history.pushState(null, '', '/other');
    unmount();

    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the document frozen until the last open drawer closes', () => {
    const first = renderOpenDrawer();
    const second = renderOpenDrawer();

    first.unmount();

    expect(document.body.style.getPropertyValue('position')).toBe('fixed');

    second.unmount();

    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
