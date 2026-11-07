import ReactDOM from 'react-dom/client';

import { installDomTranslationGuard } from '@utils/domTranslationGuard';
import { removeStartupFrameOnFirstCommit } from '@utils/startupFrame';

import { App } from './app/App';

// Guard React's DOM commits against page-translator mutations before mounting.
installDomTranslationGuard();

const rootElement = document.getElementById('root') as HTMLElement;
removeStartupFrameOnFirstCommit(rootElement);
ReactDOM.createRoot(rootElement).render(<App />);
