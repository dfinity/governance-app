import en from './en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'labels';
    resources: typeof en;
    enableSelector: true;
  }
}
