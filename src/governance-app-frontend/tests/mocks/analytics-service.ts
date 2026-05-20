// Test stub for @features/analytics/service.
// The Plausible tracker package doesn't resolve cleanly in the vitest
// environment and tests never need real tracking — this module replaces
// the real service via a vitest alias in vite.config.js.

export const analytics = {
  init: () => {},
  event: () => {},
  get initialized() {
    return false;
  },
};
