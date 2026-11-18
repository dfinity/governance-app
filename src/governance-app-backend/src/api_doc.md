# Governance app API

The governance app canister serves the NNS web app at `nns.internetcomputer.org`.
It also keeps the address book of each user, and it keeps a cache of ICP and fiat
exchange rates.

This canister holds no tokens. No method of this canister transfers tokens,
charges a fee, stakes, votes, or changes a neuron. The web app does these
actions with direct calls to the ICP ledger and the NNS governance canisters.

The manifest of the app also declares the NNS governance canister. It has no
`get_api_doc`, so the "NNS governance" section of this guide covers it.

## Identity

- The canister keys each address book by the principal of the caller.
- Internet Identity derives this principal for one origin. A principal for a
  different origin has a different, empty address book.
- On mainnet, the web app derives for `https://nns.ic0.app` on every origin.
  The NNS dapp derives for the same origin, so a user has the same principal
  in the two apps. Each app keeps its own address book.
- `/.well-known/ii-derivation-origin` gives this origin to agents. It does not
  configure the sign-in of the web app. Only the mainnet canister serves it.
- `get_address_book` and `set_address_book` return `AnonymousNotAllowed` for
  the anonymous principal.
- All other methods accept the anonymous principal.

## Units and formats

- A `rate_e8s` is a decimal number with 8 decimal places. For example,
  `264_000_000` is 2.64.
- An ICP/USD rate is the number of USD for 1 ICP.
- A `FiatExchangeRate` is the number of units of `symbol` for 1 USD.
- `timestamp_seconds` is the Unix time in seconds at which the exchange rate
  canister (XRC) observed the rate.
- `updated_at_seconds` is the Unix time in seconds at which this canister
  wrote the rate to its cache.
- The address name limits below count UTF-8 bytes, not characters.

## Query calls

Query responses are not certified. Make a read as an update call if it decides
where tokens go, for example an address from `get_address_book`. Also make it as
an update call if its result goes into `set_address_book`. An update call goes
through consensus.

## Address book

The web app uses the address book as the target of a transfer. In the send
flow, the user picks a name, and the web app sends the tokens to the address of
that name. A wrong address can send the tokens of the user to another person. A
ledger transfer cannot be undone.

Correct use of `set_address_book`:

- Make a change only if the user asks for that change.
- Use only an address that the user gives or confirms.
- Before the call, show the user each name and each full address that the call
  adds or changes.

Methods:

- `get_address_book` (query) returns the address book of the caller. A caller
  without an address book gets an empty list.
- `set_address_book` (update) replaces the full list. The list holds 20 entries
  or fewer. An entry that is not in the new list is deleted. To change one
  entry, call `get_address_book` as an update call, and then send the full
  changed list.
- `set_address_book` trims each name and changes each sequence of whitespace to
  one space. Then each name must have 3 to 64 bytes and be unique. An `Icp`
  address is the 64-character hex text of an ICP ledger account identifier. An
  `Icrc1` address is the ICRC-1 text format, with a valid checksum.
- If a check fails, `set_address_book` returns the error and changes nothing.

## Exchange rates

The canister gets each rate from the exchange rate canister (XRC). A failed
fetch leaves a gap or keeps the previous rate. The canister keeps the rates of
the last day in heap memory, so they are empty for a short time after an
upgrade.

- `get_icp_to_usd_exchange_rate` (query) returns the current ICP/USD rate and
  the rate of one day ago. The canister updates both every 5 minutes. Each one
  is empty until its first fetch succeeds.
- `get_icp_to_usd_rate_history` (query) returns the ICP/USD rates of the last
  day, oldest first. The first entry is the rate of one day ago, if it is at
  most 10 minutes older than one day.
- `list_icp_to_usd_past_month_rates` (query) returns one ICP/USD rate for each
  two-hour slot of the last 30 days, oldest first. Each rate is the first rate
  that the canister got in its slot, not the exact rate at the slot start. Its
  `timestamp_seconds` is the start of the slot, not the time of the
  observation. A slot without a rate has no entry. The canister tries again
  each day to fetch the missing slots.
- `list_usd_to_fiat_exchange_rates` (query) returns one entry for each of
  `EUR`, `GBP`, `CHF`, `JPY`, `CNY`, `CAD`, and `AUD`, in this order. The
  canister updates them every hour. The XRC changes its fiat rates one time
  each day. The `rate` is empty until its first fetch succeeds.

## HTTP

- `http_request` (query) serves the files of the web app, with a certificate.
- For a `/voting/proposals/<id>` page that has no certified copy, the response
  asks the HTTP gateway to call `http_request_update`.
- `http_request_update` (update) gets the proposal from the NNS governance
  canister and certifies a page with link preview tags. The canister keeps
  1,000 of these pages or fewer.
- An agent does not need these methods. To read a proposal, call the NNS
  governance canister.

## Documentation

- `get_api_doc` (query) returns this text.

## NNS governance

The NNS governance canister, `rrkah-fqaaa-aaaaa-aaaaq-cai`, keeps the neurons
and the proposals. This section covers only how to read proposals and neurons,
and how to vote.

### Identity and access

- Use the principal of the user for `https://nns.ic0.app`, as for this
  canister. It is the controller or a hotkey of the neurons of the user.
- Each proposal and its tally are public. The anonymous principal can read
  them.
- `ballots` holds only the ballots of the neurons that the caller controls or
  is a hotkey of.
- A vote needs a call from the controller or a hotkey of the neuron.

### Codes

- `status`: 1 is open, 2 is rejected, 3 is adopted, 4 is executed, and 5 is
  failed.
- `reward_status`: 1 means that the proposal accepts votes. A proposal can be
  adopted or rejected and still accept votes until its deadline.
- `vote`, in a ballot and in a vote: 0 is no vote yet, 1 is yes, and 2 is no.
- `topic`: 1 neuron management, 2 exchange rate, 3 network economics,
  4 governance, 5 node admin, 6 participant management, 7 subnet management,
  8 application canister management, 9 KYC, 10 node provider rewards,
  11 SNS decentralization sale (no longer used),
  12 IC OS version deployment, 13 IC OS version election, 14 SNS and Neurons'
  Fund, 15 API boundary node management, 16 subnet rental, 17 protocol canister
  management, and 18 service nervous system management.
- Timestamps are Unix times in seconds. `deadline_timestamp_seconds` is the
  end of the voting period.
- The `yes`, `no`, and `total` values of `latest_tally` are voting power, not
  ICP. The share of yes is `yes / total`.

### Read proposals

- `get_proposal_info` (query) takes a proposal ID and returns the proposal, or
  `null` if the ID is unknown.
- `list_proposals` (query) returns 100 proposals or fewer, newest first. Give
  `limit`, and set `omit_large_fields = opt true` to drop the large payloads.
  To get the next page, set `before_proposal` to the smallest ID of the last
  page.
- To list only the open proposals, set `include_status = vec { 1 }`. An empty
  `vec` in `include_status`, `exclude_topic`, or `include_reward_status` does
  not filter.
- Before a vote, read the proposal as an update call. A query response is not
  certified.

### Read the neurons of the user

- `list_neurons` (query) with `neuron_ids = vec {}` and
  `include_neurons_readable_by_caller = true` returns the neurons of the
  caller. If `total_pages_available` is more than 1, read the next
  `page_number`.
- `full_neurons` has the full data of each neuron, `neuron_infos` has a short
  view. A neuron ID is a `nat64`.

### Vote

Call `manage_neuron` (update) one time for each neuron:

```candid
(record {
  neuron_id_or_subaccount = opt variant { NeuronId = record { id = 123 : nat64 } };
  command = opt variant {
    RegisterVote = record { vote = 1 : int32; proposal = opt record { id = 456 : nat64 } }
  };
})
```

- If the vote succeeds, the response is
  `command = opt variant { RegisterVote = record {} }`. If it fails, the
  response is `command = opt variant { Error = ... }`.
- A neuron can vote on a proposal only if the proposal has a ballot for it.
  The proposal makes the ballots when it is made, for each neuron with a
  dissolve delay of 14 days or more at that time. A neuron management proposal
  (topic 1) is the exception: it has ballots only for the followees of the
  managed neuron on topic 1.
- A vote cannot be changed or undone. A second vote with the same neuron
  returns an error.
- A vote can make the neurons that follow this neuron vote. A follower votes
  yes if more than half of its followees for the topic vote yes. It votes no if
  half or more of them vote no. So with two followees, one no vote is enough.
  Do not report the votes of followers. Read their ballots instead.

Correct use of a vote:

- Vote only if the user asks for that vote.
- Before the call, show the user the proposal ID, its title, the vote (yes or
  no), and each neuron ID that votes.
- Vote only after the user confirms these.

### Other methods

`manage_neuron` has other commands, for example `Disburse`, `Split`,
`Configure`, and `SetFollowing`. They move ICP or change a neuron, and most of
them cannot be undone. Do not use them, and do not call the other update
methods of NNS governance. The user can do these actions in the web app.
