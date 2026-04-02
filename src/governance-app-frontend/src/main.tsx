import ReactDOM from 'react-dom/client';

import { App } from './app/App';
import { RootErrorBoundary } from './app/RootErrorBoundary';

const rootElement = document.getElementById('root') as HTMLElement;
ReactDOM.createRoot(rootElement).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
