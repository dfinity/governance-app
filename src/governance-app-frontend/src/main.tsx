import ReactDOM from 'react-dom/client';

import { installDomTranslationGuard } from '@utils/domTranslationGuard';
import { routerConfig } from '@utils/initializer';
import { preloadSessionRouteChunks } from '@utils/router';

import { App } from './app/App';

// Guard React's DOM commits against page-translator mutations before mounting.
installDomTranslationGuard();

preloadSessionRouteChunks(routerConfig);

const rootElement = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(rootElement).render(<App />);
