import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export type CheckResult = { 'abusive' : Array<string> } |
  { 'constructive' : null } |
  { 'nonActionable' : Array<string> };
export interface NonConstructiveProposalIds {
  'abusive' : Array<bigint>,
  'non_actionable' : Array<bigint>,
}
export interface SpamFilterStats {
  'checked_count' : bigint,
  'error_queue_size' : bigint,
  'scan_pointer' : [] | [bigint],
}
export interface _SERVICE {
  'get_all_checked_proposal_ids' : ActorMethod<[], Array<bigint>>,
  'get_error_queue' : ActorMethod<[], Array<bigint>>,
  'get_non_constructive_proposal_ids' : ActorMethod<[], NonConstructiveProposalIds>,
  'get_recent_results' : ActorMethod<[bigint], Array<[bigint, CheckResult]>>,
  'get_stats' : ActorMethod<[], SpamFilterStats>,
  're_evaluate' : ActorMethod<[bigint], CheckResult>,
  'spam_check' : ActorMethod<[Array<bigint>], Array<[bigint, [] | [CheckResult]]>>,
  'upload_archived_proposal' : ActorMethod<[bigint, string, string, [] | [string]], CheckResult>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
