import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './de.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'de'],
  // defaultNS: '',
  ns: Object.keys(en),
  resources: {
    en,
    de,
  },
  interpolation: { escapeValue: false }, // done by react
  returnNull: false,
});

export default i18n;
