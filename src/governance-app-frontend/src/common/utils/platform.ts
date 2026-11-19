/** Whether the device is an Apple one, where the command key replaces Ctrl in shortcuts. */
export const isApplePlatform =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
