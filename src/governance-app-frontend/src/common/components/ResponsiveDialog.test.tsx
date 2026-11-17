import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from '@components/ResponsiveDialog';
import { tapOverlay, waitForOutsideListeners } from '@utils/unitTest';

const media = vi.hoisted(() => ({ isDesktop: false }));
vi.mock('@hooks/useMediaQuery', () => ({ useMediaQuery: () => media.isDesktop }));

const TestDialog = ({
  onOpenChange,
  onPointerDownOutside,
}: {
  onOpenChange: (open: boolean) => void;
  onPointerDownOutside?: (event: Event) => void;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        setOpen(value);
      }}
    >
      <ResponsiveDialogContent onPointerDownOutside={onPointerDownOutside}>
        <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe.each([
  { variant: 'drawer', isDesktop: false },
  { variant: 'dialog', isDesktop: true },
])('ResponsiveDialog as a $variant', ({ isDesktop }) => {
  beforeEach(() => {
    media.isDesktop = isDesktop;
  });

  it.each(['touch', 'mouse'] as const)('closes on a %s tap on the overlay', async (pointerType) => {
    const onOpenChange = vi.fn();
    render(<TestDialog onOpenChange={onOpenChange} />);
    await waitForOutsideListeners();

    tapOverlay(pointerType);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('stays open on an overlay tap when onPointerDownOutside prevents it', async () => {
    const onOpenChange = vi.fn();
    render(
      <TestDialog onOpenChange={onOpenChange} onPointerDownOutside={(e) => e.preventDefault()} />,
    );
    await waitForOutsideListeners();

    tapOverlay('touch');
    await nextTask();

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('stays open on a tap inside the content', async () => {
    // vaul captures the pointer on a press inside the drawer. jsdom has no pointer capture.
    Element.prototype.setPointerCapture = vi.fn();
    const onOpenChange = vi.fn();
    render(<TestDialog onOpenChange={onOpenChange} />);
    await waitForOutsideListeners();

    fireEvent.pointerDown(screen.getByRole('dialog'), { pointerType: 'touch' });
    fireEvent.click(screen.getByRole('dialog'));
    await nextTask();

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
