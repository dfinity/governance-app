import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        demo: {
          headline: 'The Governance App',
          login: 'Login with Internet Identity!',
          yourPrincipal: 'Hello world! You are: {{principal}}',
          selectedTheme: 'You are using the theme: {{theme}}',
          toggleTheme: 'Toggle theme',
          changeLang: 'Switch to {{lang}}',
        },
      },
    },
    de: {
      translation: {
        demo: {
          headline: 'Die Governance-App',
          login: 'Mit Internet Identity anmelden!',
          yourPrincipal: 'Hallo Welt! Deine Principal-ID ist: {{principal}}',
          selectedTheme: 'Du verwendest das Theme: {{theme}}',
          toggleTheme: 'Theme wechseln',
          changeLang: 'Zu {{lang}} wechseln',
        },
      },
    },
  },
  lng: 'en', // default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // done by react
  },
});

export default i18n;
