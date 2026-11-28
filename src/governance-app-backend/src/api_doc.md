# Governance app API

The governance app canister serves the NNS web app at `nns.internetcomputer.org`.
It also keeps the address book of each user, and it keeps a cache of ICP and fiat
exchange rates.

This canister holds no tokens. No method of this canister transfers tokens,
charges a fee, stakes, votes, or changes a neuron. The web app does these
actions with direct calls to the ICP ledger and the NNS governance canisters.

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
- `list_daily_exchange_rates` (query) returns the rates at 00:00 UTC of each
  day that starts at or after `from_timestamp_seconds` and before
  `to_timestamp_seconds`, oldest first. The history starts on 1 January 2025,
  and the canister keeps it in stable memory. Each day has the ICP/USD rate
  and, if you give `fiat_symbol`, the USD/fiat rate. A day without a rate has
  no entry, and a missing rate is empty. The canister gets a USD/fiat rate
  only 3 days after the day starts, because the XRC can change it until then.
  Every 6 hours, the canister fetches the missing rates. After a failed fetch,
  a rate waits 5 hours before the next try, and each new failure doubles the
  wait, up to 30 days. So a gap can stay for a long time. A `fiat_symbol` that
  is not in the list above returns `UnsupportedFiatSymbol`.

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
