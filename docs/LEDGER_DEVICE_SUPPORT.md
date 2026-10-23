# Ledger device support: analysis and plan

Date: 2026-10-15. Reference implementation: `nns-dapp` (frontend/src/lib).

## 1. Conclusion

Ledger device support is feasible. The app already has two of the three
building blocks:

- It reads the nns-dapp account record (`get_account`) for sub-accounts. The
  same record carries `hardware_wallet_accounts` (name, principal, account
  identifier). The II principal is the same in both apps because
  `II_DERIVATION_ORIGIN` is `https://nns.ic0.app`. A device that a user
  registers in nns-dapp is visible here with no backend change.
- It already models hotkey-only neurons. `isUserHotkey` hides the
  controller-only actions. A Ledger neuron with the II principal as hotkey
  already works for vote, follow, and refresh voting power.

The missing block is signing with the device. That is a port of the nns-dapp
`LedgerIdentity` plus a signer-aware canister layer and the UI flows.

The hard limits are the browser (WebHID is Chromium desktop only) and the
command set that the Ledger app can parse (no `SetFollowing`, no
`ClaimOrRefresh`). Section 5 lists all limits.

## 2. How nns-dapp does it

### 2.1 Identity and signing

| nns-dapp file | Role |
| --- | --- |
| `identities/ledger.identity.ts` | `LedgerIdentity extends SignIdentity`. Owns the derive path and the secp256k1 public key. |
| `keys/secp256k1.ts` | `Secp256k1PublicKey` (DER prefix + 65-byte raw key). |
| `utils/ledger.utils.ts` | Decodes device responses, maps return codes to errors, builds `read_state` paths. |
| `constants/ledger.constants.ts`, `constants/ledger-app.constants.ts` | Derive path `m/44'/223'/0'/0/0`, signature length 64, min app versions. |
| `types/ledger.errors.ts` | `LedgerErrorKey` (i18n key) and `LedgerErrorMessage` (formatted text). |
| `proxy/icp-ledger.services.proxy.ts` | Dynamic `import()` so the Ledger libraries stay out of the main bundle. |

Key behaviors of `LedgerIdentity`:

- `create()` opens a WebHID transport, calls `getAddressAndPubKey`, verifies
  that the returned principal is `Principal.selfAuthenticating(derKey)`, then
  closes the transport. Every later device call opens and closes its own
  transport (`executeWithApp`).
- `transformRequest` overrides the agent-js hook. For a `call` request it
  signs the call body and the matching `read_state` body in one device
  interaction (`signUpdateCall`), then caches the `read_state` signature by
  request id. When agent-js polls `read_state`, the cached signature is reused
  and the user does not approve twice. The cache compares the CBOR of the
  request with the cached `ingress_expiry`.
- `flagUpcomingStakeNeuron()` sets the Ledger `txtype` (P2 `is_stake_tx`) for
  the ICP transfer that creates a neuron.
- `sign()` and `signWithReadState()` first assert that the app version is at
  least `ALL_CANDID_TXS_VERSION` (2.4.9). Older versions throw before signing.
- `showAddressAndPubKeyOnDevice()` and `getVersion()` are user-facing helpers
  (Ledger requires an address-verification button).

### 2.2 Registry and account model

- The nns-dapp backend stores named Ledger accounts per II principal
  (`register_hardware_wallet`, max 255). The frontend merges them into the
  accounts list as `type: "hardwareWallet"`.
- `getAccountIdentity(identifier)` returns the II identity for main and
  sub-accounts, and a fresh `LedgerIdentity` for a hardware wallet account. It
  checks that the device principal matches the registered account.
- `getIdentityOfControllerByNeuronId` resolves the signer: II when the II
  principal is the controller, the Ledger identity when the controller is a
  registered device principal, else `NotAuthorizedNeuronError`.
- Follow and set-following prefer the hotkey (II) identity and fall back to
  the controller only when the II principal is not a hotkey, or for the
  `NeuronManagement` topic.
- Vote and refresh voting power use the II identity when it is a hotkey.

### 2.3 Flows and gates

- Add account: "Ledger device" option, connect button, name, create. Registers
  in the backend.
- Wallet page: "Show principal and address on device", "Show neurons". The
  latter calls `list_neurons` signed by the device and offers "Add hotkey"
  (adds the II principal) per neuron so it appears in the normal neurons list.
  nns-dapp passes `includeEmptyNeurons: undefined` for app 2.4.9 compatibility.
- Stake neuron from a Ledger account: ICP transfer signed by the device with
  the stake flag, then `claim_or_refresh` sent with an `AnonymousIdentity`
  because the device cannot parse that call. The neuron is not loaded after
  staking because the II principal is not yet a hotkey.
- Top-up of a Ledger neuron: same pattern, anonymous `claim_or_refresh`.
- Gates: change visibility is disabled for Ledger neurons; spawn is fixed at
  100 % of maturity; version asserts per action (`CANDID_PARSER_VERSION` 2.2.1,
  `SNS_SUPPORT_VERSION` 2.3.0). Busy screen "Please use your Ledger device to
  approve".
- Errors map Ledger return codes and WebHID errors to i18n keys: app not open,
  device locked, access denied, no device, other app open (Ledger Live),
  browser not supported, user rejected, wrong device.

### 2.4 Tests

- `tests/mocks/ledger.identity.mock.ts`: `MockLedgerIdentity` with a fixed
  public key; `LedgerIdentity.connect` and `fetchPublicKeyFromDevice` are
  public static so tests can stub them.
- Unit tests cover the read-state cache, the stake flag, and version checks.
- No e2e test uses a device.

### 2.5 Build

- `vite.config.ts` injects `Buffer` into `@ledgerhq/**` and defines
  `global: "globalThis"`. The `buffer` package is a dependency.
- Dependencies: `@zondax/ledger-icp` 4.0.0, `@zondax/ledger-js` 2.1,
  `@ledgerhq/hw-transport-webhid` 6.30, `@ledgerhq/hw-transport` (types only).
  nns-dapp PR #8116 replaces the legacy transport with the Ledger Device
  Management Kit (`@ledgerhq/device-management-kit`,
  `@ledgerhq/device-transport-kit-web-hid`, `rxjs`) wrapped in `DMKTransport`
  from `@zondax/ledger-js`. The signing code does not change.

## 3. What the governance app has today

| Area | State | Files |
| --- | --- | --- |
| Agents | Two singletons: anonymous and II-authenticated. Hooks and route loaders both read them. | `common/canisters/agents.ts`, `common/canisters/index.ts`, `app/contexts/agentPoolProvider.tsx` |
| Canister hooks | One canister per hook, bound to the II agent. Every mutation hook calls `useNnsGovernance()` or `useIcpLedger()`. | `common/hooks/governance/useGovernance.ts`, `common/hooks/icpLedger/useIcpLedger.ts` |
| Accounts | Main + sub-accounts from nns-dapp `get_account`. `AccountType` has `Main` and `Subaccount` only. | `features/accounts/types.ts`, `features/accounts/hooks/*` |
| nns-dapp declarations | `AccountDetails.hardware_wallet_accounts` is already typed. | `src/declarations/nns-dapp/nns-dapp.did.d.ts` |
| Neuron permissions | `isUserHotkey`, `isUserControllerOrHotkey`. Controller-only actions are hidden for hotkey neurons. | `common/utils/neuron.ts` |
| Writes | 20 governance and ledger writes (table in section 4). All use the II identity. | `features/*/hooks/*` |
| Feature flags | `useAdvancedFeatures` (localStorage, four flags). | `common/hooks/useAdvancedFeatures.ts`, `common/typings/advancedFeatures.ts` |
| Build | Vite 8 (rolldown), `global: 'globalThis'` already defined, manual vendor chunks. No `Buffer` polyfill. | `vite.config.js` |
| SDK | `@icp-sdk/core` 5.0.0, same as nns-dapp. `SignIdentity.transformRequest` is identical. | `package.json` |
| Tests | vitest + Testing Library; Playwright e2e with a real II flow and stubbed exchange rate. | `tests/` |
| Dev tools | Dev-only modals (add hotkey, get tokens). | `src/dev/` |

## 4. Operation matrix

Signer column: `II` = Internet Identity (hotkey or controller), `Device` =
Ledger signs, `Anon` = anonymous call. "Ledger app" says whether the device
parser (Zondax `nns_parser.c`, app 4.2.16) handles the command.

| Operation | App file | Signer for a Ledger neuron or account | Ledger app | Notes |
| --- | --- | --- | --- | --- |
| Vote | `proposals/hooks/useVoting.ts` | II (hotkey) | RegisterVote ok | Keep hotkey. Device only when no hotkey; then serialize the parallel `Promise.all`. |
| Set following | `voting/components/*`, `useCreateNeuron.ts` | II (hotkey) | SetFollowing NOT parsed, only Follow | Device cannot sign `set_following`. Hotkey is mandatory. |
| Refresh voting power | `stakes/hooks/useRefreshVotingPower*.ts` | II (hotkey) | RefreshVotingPower ok | Keep hotkey. |
| Stake neuron | `stakes/hooks/useCreateNeuron.ts` | Device transfer (stake flag) + Anon claim | Transfer ok, ClaimOrRefresh not parsed | Needs a custom stake path: `IcpLedgerCanister` with the device agent, `NnsGovernanceCanister` with the anonymous agent. Then add the II hotkey (device). |
| Increase stake | `stakes/hooks/useIncreaseStake.ts` | Device transfer + Anon claim | same | Same split as stake. |
| Increase dissolve delay | `useIncreaseDelay.ts` | Device | IncreaseDissolveDelay ok | |
| Start / stop dissolving | `useToggleDissolving.ts` | Device | ok | |
| Auto-stake maturity | `useToggleMaturityMode.ts` | Device | ChangeAutoStakeMaturity ok | |
| Stake maturity | `useStakeMaturity.ts` | Device | StakeMaturity ok | |
| Disburse | `useDisburseNeuron.ts` | Device | Disburse ok | |
| Disburse maturity | `useDisburseMaturity.ts` | Device | DisburseMaturity ok | |
| Add hotkey | `useAddHotkey.ts` (dev only today) | Device | AddHotkey ok | Becomes a product flow: "Add this app as hotkey". |
| Send ICP | `account/components/SendICPButton.tsx` | Device | transfer and icrc1_transfer ok | From a Ledger account. |
| Create / rename sub-account | `useCreateSubAccount.ts`, `useRenameSubAccount.ts` | II | n/a | nns-dapp canister call. Not a device action. |
| Address book | `useSaveAddressBook.ts` | II | n/a | Governance backend. Not a device action. |
| Change visibility | not in app | Device | SetVisibility parsed in 4.x | nns-dapp still disables it. Out of scope. |
| Split, merge, spawn, neurons' fund | not in app | | | Out of scope. |

## 5. Limitations

1. **Browser.** WebHID exists only in Chromium on desktop (Chrome, Edge,
   Opera, Brave). Safari, Firefox, iOS, and Android Chrome have no WebHID. The
   feature must be hidden when `navigator.hid` is undefined. The mobile PWA
   gets no device support. Web Bluetooth (`@ledgerhq/hw-transport-web-ble`)
   adds Android Chrome and desktop Chromium for Nano X, Stax, Flex, but not
   iOS. Ledger ended support for the LedgerJS transports and points to the
   Device Management Kit (DMK). This app opens the device through the DMK
   over WebHID from day one, so the browser limit is the same, but the
   integration is the supported one. Evaluate Bluetooth through the DMK in a
   later phase.
2. **Ledger app command set.** The device parser handles Configure
   (dissolve, hotkeys, auto-stake, visibility, neurons' fund), Disburse,
   DisburseMaturity, StakeMaturity, Spawn, Split, Merge, Follow, RegisterVote,
   RefreshVotingPower, transfer, icrc1_transfer, icrc2_approve, list_neurons.
   It rejects `SetFollowing` and `ClaimOrRefresh`. Consequences:
   - Following on a Ledger neuron needs the II principal as hotkey.
   - Staking and top-up need an anonymous `claim_or_refresh`.
   - The `NeuronManagement` topic cannot be followed from this app for a
     Ledger neuron (controller only, and the device cannot sign it).
3. **Minimum app version 2.4.9.** Older apps fail the version assert. The
   current release is 4.2.16 (2026-08-27). Nano S (original) is no longer a
   supported model (S+, X, Stax, Flex, Apex P are).
4. **Every device action is manual.** One approval per call, one transport at
   a time. Multi-step flows (stake wizard: transfer, claim, delay, auto-stake,
   dissolve, following, hotkey) become several device prompts. Parallel calls
   must be serialized. Ledger Live or another wallet app that holds the
   device blocks the connection.
5. **No persistent device session.** nns-dapp reconnects on every action
   (`LedgerIdentity.create()` reads the public key again). The device principal
   is re-checked against the registered account each time. A cached identity
   per browser session is possible but must be dropped on logout.
6. **Registry dependency.** Reusing the nns-dapp registry keeps the device
   list in sync between both apps with no backend work. It also means
   registration calls the nns-dapp canister (`register_hardware_wallet`). An
   own registry in `governance-app-backend` would need a schema change
   (`UserData`), a migration, and would split the device list between apps.
7. **Neuron visibility.** `list_neurons` with the II identity returns only
   neurons where II is controller or hotkey. Ledger neurons without the II
   hotkey are invisible until the user runs "Show neurons on device" and adds
   the hotkey. Recommendation: add the hotkey automatically at the end of the
   stake wizard (one extra device prompt).
8. **Testing.** No real device in CI. Unit tests mock `LedgerIdentity.connect`.
   Playwright can inject a fake transport through `page.addInitScript`. The
   Zemu emulator (Zondax, Docker) can run the real app but is heavy; keep it
   out of the first iteration.
9. **Bundle.** `@zondax/ledger-icp` uses `Buffer`. The app needs the `buffer`
   package and a dynamic import boundary so the main bundle does not grow.
10. **Dependencies.** Six new packages (`@zondax/ledger-icp`,
    `@zondax/ledger-js`, `@ledgerhq/device-management-kit`,
    `@ledgerhq/device-transport-kit-web-hid`, `rxjs`, `buffer`). The DMK
    brings `xstate`, `inversify`, `purify-ts`, and `reflect-metadata` into the
    lazy chunk. `min-release-age=7` applies.

## 6. Design decisions (recommended)

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Registry | nns-dapp canister | Already read for sub-accounts, same principal, zero backend work, one device list for both apps. |
| Transport | Device Management Kit over WebHID, feature-detected | The supported Ledger integration; same as nns-dapp PR #8116. Bluetooth later. |
| Feature gate | New advanced feature `ledgerDevice`, visible only when `navigator.hid` exists | Matches the existing opt-in pattern; keeps mobile untouched. |
| Signer model | A `Signer` value (`{ kind: 'ii' } \| { kind: 'ledger', principal }`) resolved per neuron or account; canister factories take a signer | Keeps hooks small. Avoids a global mutable identity. |
| Hotkey policy | Prefer II hotkey for vote, follow, refresh; device only for controller-only actions | Fewest device prompts. Same as nns-dapp. |
| After stake | Add the II hotkey automatically | Neuron shows up at once. |
| Identity cache | Cache the `LedgerIdentity` per device principal for the browser session; drop on logout and on principal mismatch | Fewer "connect" prompts than nns-dapp. |

## 7. Implementation plan

Each phase is one or two PRs. Phases 1 to 3 have no dependency between them
and can run in parallel. Phases 4 to 7 depend on 1 to 3. Validation for every
PR: `tsc`, `lint`, `format`, `check:i18n`, `vitest` in the frontend
workspace, plus e2e where noted.

### Phase 0: Decisions and dependencies (needs your approval)

- Confirm the decisions in section 6.
- Add `@zondax/ledger-icp`, `@zondax/ledger-js`,
  `@ledgerhq/device-management-kit`, `@ledgerhq/device-transport-kit-web-hid`,
  `rxjs`, `buffer`. Update the lock incrementally.
- `vite.config.js`: a `vendor-ledger` manual chunk for `@zondax`, `@ledgerhq`,
  and the DMK dependencies; `buffer` in its own `vendor-buffer` chunk. The
  module sets `globalThis.Buffer` from the `buffer` package before it loads
  the Ledger libraries, so no bundler plugin is needed.

### Phase 1: Core identity module (no UI)

Port from nns-dapp into `src/common/ledger/`:

- `ledgerIdentity.ts` (`LedgerIdentity`), `secp256k1.ts`, `ledgerUtils.ts`,
  `constants.ts`, `errors.ts`.
- Replace Svelte i18n with error codes; the UI maps codes to `react-i18next`
  keys. Keep `connect` and `fetchPublicKeyFromDevice` public static for tests.
- Add a `isWebHidSupported()` helper.
- Port the unit tests: read-state cache, stake flag, version assert, public key
  decode, error mapping. Add `tests/mocks/ledgerIdentity.ts`
  (`MockLedgerIdentity`).

Done when the module signs a `call` and reuses the `read_state` signature in
tests, with the Ledger libraries loaded only through dynamic `import()`.

### Phase 2: Signer-aware agents and canisters

- `common/canisters/agents.ts`: `getLedgerAgent(identity)` keyed by principal,
  `clearLedgerAgents()` on logout (`useLogout`, `agentPoolProvider`).
- `common/canisters/index.ts`: factories accept an `Identity` or a `Signer`
  (`getNnsGovernanceCanister({ signer })`, `getIcpLedgerCanister({ signer })`,
  plus an anonymous governance canister for `claim_or_refresh`).
- `common/ledger/session.ts`: `getLedgerIdentity(principal)` that connects,
  verifies the principal, caches for the session, and throws a typed error on
  mismatch.
- `common/utils/neuron.ts`: `resolveNeuronSigner({ neuron, iiPrincipal,
  ledgerPrincipals })` returning `ii`, `ledger`, or `none`, and
  `isNeuronControlledByLedger`.
- Tests for the resolver and the agent cache.

Done when a mutation can run with a `Signer` without touching React state.

### Phase 3: Ledger accounts in the account model

- `features/accounts/types.ts`: `AccountType.HardwareWallet`, `principal` on
  `AccountMetadata`.
- `useHardwareWalletsMetadata` from `useNnsDappAccount`
  (`hardware_wallet_accounts`), merged in `useAccounts` behind the
  `ledgerDevice` flag.
- `useAdvancedFeatures` / `advancedFeatures.ts` / `ADVANCED_FEATURES`: new
  flag, hidden when WebHID is absent.
- Account list and selectors (`AccountsList`, `AccountSelect`,
  `useAccountSelection`): show a "Ledger device" badge; exclude Ledger accounts
  where the flow cannot sign with a device yet (until phases 6 and 7).
- Balances come from the existing `useIcpLedgerAccountsBalances`.
- i18n in `src/i18n/en/*.json`.

Done when a device registered in nns-dapp shows with its balance.

### Phase 4: Connect, register, verify

- Settings card "Ledger device" (next to `ManageIICard`) and an "Add Ledger
  device" entry in the accounts area:
  1. Connect (WebHID prompt), show principal and account identifier.
  2. Name, then register through nns-dapp `register_hardware_wallet`; handle
     `AlreadyRegistered`, `NameTooLong`, limit errors.
  3. "Verify on device" button (`showAddressAndPubKeyOnDevice`).
- `DeviceApprovalDialog`: a blocking dialog "Approve on your Ledger device"
  used by every device action, with cancel.
- Error mapping to toasts (`sonner`) for the full nns-dapp error list.
- Analytics events: connect, register, verify, each error reason.

Done when a new device can be registered from this app and appears in
nns-dapp.

### Phase 5: Neurons on the device and hotkeys

- "Show neurons on device": `list_neurons` with the Ledger agent
  (`includeEmptyNeurons: undefined`), table with stake and a per-neuron "Add
  this app as hotkey" (device signs `AddHotkey` with the II principal).
- Promote `useAddHotkey` from `src/dev` to a product hook with a `Signer`.
- Invalidate `NNS_GOVERNANCE.NEURONS` after each hotkey.
- Neuron card and detail: "Ledger device" tag when the controller is a
  registered device principal.

Done when a Ledger neuron appears in the normal list after the hotkey is
added.

### Phase 6: Controller-only actions with the device

For each hook in the matrix (dissolve delay, toggle dissolving, auto-stake,
stake maturity, disburse, disburse maturity, remove hotkey if added):

- Resolve the signer per neuron; open `DeviceApprovalDialog` while the device
  signs; keep the II path unchanged.
- Un-hide the controller-only actions in the neuron detail for Ledger neurons
  when the `ledgerDevice` flag is on and WebHID exists.
- `useVoting`: if any eligible neuron has no II hotkey and is a Ledger neuron,
  vote for it with the device, in sequence, after the hotkey votes.
- Following modals: keep hotkey; show a clear message when the II principal is
  not a hotkey of a Ledger neuron (point to phase 5 flow).

Done when every controller action on a Ledger neuron completes with one
device approval.

### Phase 7: Stake, top-up, and send from a Ledger account

- `useCreateNeuron`: when the source account is a Ledger account, call
  `flagUpcomingStakeNeuron()`, transfer with the device agent, claim with the
  anonymous governance canister, then add the II hotkey, then continue the
  wizard steps with the II hotkey where allowed (following) and the device
  where controller-only (delay, auto-stake, dissolving). Count the prompts in
  the confirmation step.
- `useIncreaseStake`: device transfer + anonymous claim.
- `SendICPButton`: allow a Ledger source account; sign with the device.
- Remove the exclusions added in phase 3.

Done when a neuron can be created, topped up, and ICP sent from a Ledger
account.

### Phase 8: Hardening and release

- Playwright: fake transport injected with `addInitScript` (fixed key pair
  signs locally) for the register, add-hotkey, and one controller action.
- `docs/FE.md` section on the Ledger module.
- Release notes and in-app feature announcement.
- Optional: Bluetooth transport through the DMK for Android Chrome.

## 8. Open questions

1. Expert mode on the device for stake transactions: the Zondax tests run the
   stake fixtures with expert mode on. Verify on a real device whether the
   stake flag needs it, and document it in the UI if so.
2. Should the governance app also offer "Remove hotkey" and "Change
   visibility" for Ledger neurons? Both are parsed by app 4.x but nns-dapp
   keeps visibility disabled. Proposal: not in the first iteration.
3. Minimum app version: keep 2.4.9 (nns-dapp) or raise to a 4.x version so
   `DisburseMaturity` and `SetVisibility` are guaranteed? Needs the exact
   version that added `DisburseMaturity`.
