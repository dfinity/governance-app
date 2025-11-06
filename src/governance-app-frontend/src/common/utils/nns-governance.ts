import {
  CouldNotClaimNeuronError,
  GovernanceError,
  InsufficientAmountError,
  UnrecognizedTypeError,
  UnsupportedValueError,
} from '@icp-sdk/canisters/nns';
import { t } from 'i18next';

// ref. https://github.com/dfinity/ic-js/blob/48a2ee1a6afa230eb86e2599147defe71cd16013/packages/nns/src/errors/governance.errors.ts
export const mapGovernanceCanisterError = (error: Error): string => {
  if (error instanceof CouldNotClaimNeuronError) {
    return t(($) => $.errors.nnsGovernanceErrors.CouldNotClaimNeuronError);
  }

  if (error instanceof InsufficientAmountError) {
    return t(($) => $.errors.nnsGovernanceErrors.InsufficientAmountError);
  }

  if (error instanceof UnrecognizedTypeError) {
    return t(($) => $.errors.nnsGovernanceErrors.UnrecognizedTypeError);
  }

  if (error instanceof GovernanceError) {
    return t(($) => $.errors.nnsGovernanceErrors.GovernanceError);
  }

  if (error instanceof UnsupportedValueError) {
    return t(($) => $.errors.nnsGovernanceErrors.UnsupportedValueError);
  }

  return t(($) => $.common.unknownError);
};
