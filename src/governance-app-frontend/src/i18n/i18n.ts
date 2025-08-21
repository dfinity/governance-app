import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import resources from './generated-toc';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(resources.en),

  resources,

  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
