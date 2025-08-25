import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './en/common.json';
import home from './en/home.json';

export const resources = {
  en: {
    labels: {
      common,
      home,
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
