import Resources from "./i18n-resources.d";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: Resources;
    // TODO: add more languages
    // resources: (typeof resources)["en"];
  }
}

/*
import coreEn from './en/core.json';
import demoEn from './en/demo.json';

// import { resources } from './i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'core';
    coreEn: typeof coreEn;
    demoEn: typeof demoEn;
    // resources: (typeof resources)['en'];
  }
}
*/
// import 'i18next';

// // use en for types
// import demo from 'en/demo.json';

// declare module 'i18next' {
//   // Extend CustomTypeOptions
//   interface CustomTypeOptions {
//     defaultNS: 'demo';
//     // custom resources type
//     resources: {
//       demo: typeof demo;
//     };
//   }
// }
