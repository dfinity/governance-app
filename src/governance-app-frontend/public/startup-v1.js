// Runs before the first paint. It sets the theme and picks the static frame in `index.html`.
// The asset canister serves each `.js` file as immutable: change the version in the file name
// and in `index.html` when this file changes.
(function () {
  var html = document.documentElement;
  var theme = null;
  var sessionExpiry = 0;
  var features = {};

  try {
    theme = localStorage.getItem('nns-theme');
    // The auth client keeps `<principal>|<expiration in nanoseconds>` here while a session lives.
    sessionExpiry = (localStorage.getItem('ic-session-state') || '').split('|')[1] / 1e6;
    features = JSON.parse(localStorage.getItem('nns-advanced-features')) || {};
  } catch (e) {
    // Storage is blocked or holds bad data: use the system theme and the logged-out frame.
  }

  // Same result as `applyTheme` in `useTheme.ts`. The colors are `THEME_COLOR`.
  var dark =
    theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  html.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#14110d' : '#faf9f5';

  if (sessionExpiry > Date.now()) {
    var path = location.pathname.split('/');
    html.dataset.session = '';
    html.dataset.nav = path[1] || 'dashboard';
    if (path[2] === 'proposals') html.dataset.detail = '';
    if (features.subaccounts || features.ledgerDevice) html.dataset.accounts = '';
  }
})();
