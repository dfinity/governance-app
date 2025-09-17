import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './en/common.json';
import enums from './en/enums.json';
import home from './en/home.json';
import neuron from './en/neuron.json';
import nns from './en/nns.json';
import proposal from './en/proposal.json';
import sns from './en/sns.json';
import vault from './en/vault.json';

// Using a single namespace "labels" for simplicity.
// Files inside it (common, home, …) are grouped translations, not separate namespaces.
export const resources = {
  en: {
    labels: {
      common,
      enums,
      home,
      nns,
      proposal,
      neuron,
      sns,
      vault,
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
