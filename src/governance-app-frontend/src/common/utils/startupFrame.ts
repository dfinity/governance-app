/**
 * Removes the static frame of `index.html` when React first adds an element to `root`.
 * The observer callback is a microtask, so the browser never paints both, or neither.
 */
export const removeStartupFrameOnFirstCommit = (root: HTMLElement): void => {
  const frame = document.getElementById('startup-frame');
  if (!frame) return;

  const observer = new MutationObserver(() => {
    if (root.childElementCount === 0) return;
    frame.remove();
    observer.disconnect();
  });
  observer.observe(root, { childList: true });
};
