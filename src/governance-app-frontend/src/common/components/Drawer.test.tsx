import { act, render, screen } from '@testing-library/react';
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

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

const LAYOUT_HEIGHT = 796;

class FakeVisualViewport extends EventTarget {
  height = LAYOUT_HEIGHT;
  offsetTop = 0;

  set(height: number, offsetTop: number, event: 'resize' | 'scroll') {
    this.height = height;
    this.offsetTop = offsetTop;
    this.dispatchEvent(new Event(event));
  }
}

let viewport: FakeVisualViewport;

const renderDrawer = async (userAgent: string) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.resetModules();
  const { Drawer, DrawerContent, DrawerTitle } = await import('./Drawer');
  render(
    <Drawer open>
      <DrawerContent data-testid="content">
        <DrawerTitle>Send</DrawerTitle>
        <input />
      </DrawerContent>
    </Drawer>,
  );
  return screen.getByTestId('content');
};

describe('DrawerContent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    viewport = new FakeVisualViewport();
    vi.stubGlobal('visualViewport', viewport);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(LAYOUT_HEIGHT);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ends at the visible bottom on iOS after the window scrolls to the field', async () => {
    const content = await renderDrawer(IPHONE_UA);

    // iOS 26 Safari: the keyboard resize comes first, then the scroll to the field.
    act(() => {
      viewport.set(449, 0, 'resize');
      vi.advanceTimersByTime(100);
      viewport.set(449, 288, 'scroll');
      vi.advanceTimersByTime(100);
    });

    expect(content.style.getPropertyValue('--drawer-keyboard-inset')).toBe('59px');
    expect(content.style.getPropertyValue('--drawer-visible-height')).toBe('449px');
  });

  it('ends at the visible bottom on iOS when it opens with the keyboard already open', async () => {
    viewport.height = 449;
    viewport.offsetTop = 288;

    const content = await renderDrawer(IPHONE_UA);

    expect(content.style.getPropertyValue('--drawer-keyboard-inset')).toBe('59px');
    expect(content.style.getPropertyValue('--drawer-visible-height')).toBe('449px');
  });

  it('returns to the layout bottom on iOS when the keyboard closes', async () => {
    const content = await renderDrawer(IPHONE_UA);

    act(() => {
      viewport.set(449, 288, 'resize');
      vi.advanceTimersByTime(100);
    });
    expect(content.style.getPropertyValue('--drawer-keyboard-inset')).toBe('59px');

    // The drawer moves down without the settle delay.
    act(() => viewport.set(LAYOUT_HEIGHT, 0, 'resize'));

    expect(content.style.getPropertyValue('--drawer-keyboard-inset')).toBe('0px');
    expect(content.style.getPropertyValue('--drawer-visible-height')).toBe(`${LAYOUT_HEIGHT}px`);
  });

  it('leaves the keyboard handling to vaul outside iOS', async () => {
    const content = await renderDrawer(ANDROID_UA);

    act(() => {
      viewport.set(449, 0, 'resize');
      vi.advanceTimersByTime(100);
    });

    expect(content.style.getPropertyValue('--drawer-keyboard-inset')).toBe('');
  });
});
