import { InternetIdentityProvider } from 'ic-use-internet-identity';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root') as HTMLElement;

const DFX_NETWORK = process.env.DFX_NETWORK;
const CANISTER_ID_INTERNET_IDENTITY = process.env.CANISTER_ID_INTERNET_IDENTITY;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <InternetIdentityProvider
      loginOptions={{
        identityProvider:
          DFX_NETWORK === 'local'
            ? `http://${CANISTER_ID_INTERNET_IDENTITY}.localhost:8080`
            : 'https://identity.ic0.app',
      }}
    >
      <App />
    </InternetIdentityProvider>
  </React.StrictMode>,
);
