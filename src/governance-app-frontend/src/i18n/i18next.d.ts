import { resources } from './config';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'labels';
    resources: typeof resources.en;
    // Enable `t(($) => $.text)` syntax
    enableSelector: true;
  }
}
