export const idlFactory = ({ IDL }) => {
  const CheckResult = IDL.Variant({
    'abusive' : IDL.Vec(IDL.Text),
    'constructive' : IDL.Null,
    'nonActionable' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'get_all_checked_proposal_ids' : IDL.Func([], [IDL.Vec(IDL.Nat64)], ['query']),
    'get_error_queue' : IDL.Func([], [IDL.Vec(IDL.Nat64)], ['query']),
    'get_non_constructive_proposal_ids' : IDL.Func(
      [],
      [IDL.Record({
        'abusive' : IDL.Vec(IDL.Nat64),
        'non_actionable' : IDL.Vec(IDL.Nat64),
      })],
      ['query'],
    ),
    'get_recent_results' : IDL.Func(
      [IDL.Nat],
      [IDL.Vec(IDL.Tuple(IDL.Nat64, CheckResult))],
      ['query'],
    ),
    'get_stats' : IDL.Func(
      [],
      [IDL.Record({
        'checked_count' : IDL.Nat,
        'error_queue_size' : IDL.Nat,
        'scan_pointer' : IDL.Opt(IDL.Nat64),
      })],
      ['query'],
    ),
    're_evaluate' : IDL.Func([IDL.Nat64], [CheckResult], []),
    'spam_check' : IDL.Func(
      [IDL.Vec(IDL.Nat64)],
      [IDL.Vec(IDL.Tuple(IDL.Nat64, IDL.Opt(CheckResult)))],
      ['query'],
    ),
    'upload_archived_proposal' : IDL.Func(
      [IDL.Nat64, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
      [CheckResult],
      [],
    ),
  });
};
export const init = ({ IDL }) => { return []; };
