import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import account from './en/account.json';
import common from './en/common.json';
import enums from './en/enums.json';
import errors from './en/errors.json';
import home from './en/home.json';
import neuron from './en/neuron.json';
import nns from './en/nns.json';
import proposal from './en/proposal.json';
import settings from './en/settings.json';

// Using a single namespace "labels" for simplicity.
// Files inside it (common, home, …) are grouped translations, not separate namespaces.
export const resources = {
  en: {
    labels: {
      common,
      enums,
      errors,
      home,
      nns,
      proposal,
      neuron,
      account,
      settings,
    },
  },
};

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  defaultNS: 'labels',
  ns: Object.keys(resources.en),
  resources,
  interpolation: { escapeValue: false }, // Done by React.
  returnNull: false,
  returnObjects: true,
});

export default i18n;
