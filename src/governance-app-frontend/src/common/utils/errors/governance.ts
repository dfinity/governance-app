import {
  CouldNotClaimNeuronError,
  GovernanceError,
  InsufficientAmountError,
  UnrecognizedTypeError,
  UnsupportedValueError,
} from '@icp-sdk/canisters/nns';
import { t } from 'i18next';

// `ErrorType::NeuronAlreadyVoted` in the NNS Governance canister.
const NEURON_ALREADY_VOTED_ERROR_TYPE = 19;

/**
 * Checks for the error of a vote from a neuron with a ballot already cast on the proposal.
 */
export const isNeuronAlreadyVotedError = (error: unknown): boolean =>
  error instanceof GovernanceError && error.detail.error_type === NEURON_ALREADY_VOTED_ERROR_TYPE;

/**
 * Maps NNS Governance canister errors to user-friendly i18n messages.
 */
export const mapGovernanceCanisterError = (error: Error): string | undefined => {
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

  return undefined;
};
