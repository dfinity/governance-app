import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import account from './en/account.json';
import accounts from './en/accounts.json';
import addressBook from './en/addressBook.json';
import common from './en/common.json';
import errors from './en/errors.json';
import home from './en/home.json';
import knownNeurons from './en/knownNeurons.json';
import login from './en/login.json';
import apyOptimizationModal from './en/modals/apyOptimization.json';
import depositModal from './en/modals/deposit.json';
import devActionsModal from './en/modals/devActions.json';
import maturityModal from './en/modals/maturity.json';
import neuronDetailModal from './en/modals/neuronDetail.json';
import stakeWizardModal from './en/modals/stakeWizard.json';
import stakingRatioModal from './en/modals/stakingRatio.json';
import welcomeModal from './en/modals/welcome.json';
import disburseModal from './en/modals/disburse.json';
import neuron from './en/neuron.json';
import proposal from './en/proposal.json';
import userAccount from './en/userAccount.json';
import voting from './en/voting.json';

// Using a single namespace "labels" for simplicity.
// Files inside it (common, home, …) are grouped translations, not separate namespaces.
export const resources = {
  en: {
    labels: {
      common,
      errors,
      home,
      apyOptimizationModal,
      devActionsModal,
      maturityModal,
      neuronDetailModal,
      stakeWizardModal,
      stakingRatioModal,
      proposal,
      voting,
      neuron,
      account,
      accounts,
      addressBook,
      userAccount,
      welcomeModal,
      knownNeurons,
      depositModal,
      disburseModal,
      login,
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
