import { AgentError } from '@icp-sdk/core/agent';

/**
 * Returns true when the error is a certified reject from the IC (AgentError with
 * isCertified), meaning we know for certain that the canister did not execute
 * the operation.
 *
 * Update call responses are only trustworthy when certified (signed by the subnet).
 * A malicious boundary node can spoof a non-certified error (e.g. timeout, connection
 * drop) even though the transaction was actually committed. If we treat such an error
 * as "failed" and clear our dedup state, a user retry would send a new request and
 * could double-execute. So we only consider an error as "reject" (safe to clear dedup
 * state and allow a fresh retry) when the response is certified.
 */
export function isCertifiedRejectError(error: Error): boolean {
  return error instanceof AgentError && error.isCertified;
}
