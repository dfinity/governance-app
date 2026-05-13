# Hardware Wallet (Ledger device) Integration Plan

Port of the Ledger hardware-wallet integration from `nns-dapp` (Svelte 5 + Svelte stores) to `governance-app` (React 19 + TanStack Query/Router + ic-use-internet-identity + radix/shadcn + react-i18next).

The reference implementation lives at:

- `nns-dapp/frontend/src/lib/identities/ledger.identity.ts`
- `nns-dapp/frontend/src/lib/keys/secp256k1.ts`
- `nns-dapp/frontend/src/lib/utils/ledger.utils.ts`
- `nns-dapp/frontend/src/lib/services/icp-ledger.services.ts`
- `nns-dapp/frontend/src/lib/proxy/icp-ledger.services.proxy.ts`
- `nns-dapp/frontend/src/lib/components/accounts/HardwareWallet*.svelte`
- `nns-dapp/frontend/src/lib/types/ledger.errors.ts`
- `nns-dapp/frontend/src/lib/constants/{ledger,ledger-app}.constants.ts`

This document targets full parity: attach, sign ICP transfers, list & stake neurons, manage/vote neurons, verify address.

---

## 1. What "hardware wallet" actually is in NNS

A user can register one or more Ledger devices (running the Ledger Internet Computer / "ICP" app) under their NNS-dapp account. Each device becomes a separate **account** with its own principal/account identifier, alongside the user's main account and subaccounts. From a code perspective there are two distinct concerns that are both called "ledger" and must not be confused:

| Concept | Meaning | Package(s) |
|---|---|---|
| **ICP ledger canister** | The fungible token canister that holds ICP balances | `@icp-sdk/canisters/ledger/icp` (already used in this app) |
| **Hardware Ledger device** | The physical USB/HID device that signs IC requests via the "Internet Computer" Ledger app | `@zondax/ledger-icp`, `@ledgerhq/hw-transport-webhid` (new) |

This plan is exclusively about the second one. Use `hardwareLedger` / `hwLedger` in filenames to avoid collision with the existing `icpLedger/` hooks directory.

---

## 2. Dependencies to add

In `src/governance-app-frontend/package.json`:

```json
{
  "@zondax/ledger-icp": "^0.21.x",
  "@ledgerhq/hw-transport-webhid": "^6.x",
  "@ledgerhq/hw-transport": "^6.x",
  "buffer": "^6.x"
}
```

Notes:
- The Zondax library returns Node `Buffer` instances; in the browser this requires `buffer` polyfill via Vite (`vite.config.js` `resolve.alias.buffer = 'buffer'` and `optimizeDeps.include`).
- `@ledgerhq/hw-transport-webhid` requires a **secure context** (https or localhost) and a real user gesture (click) to request HID permission.
- Browser support: Chromium-based browsers only (Chrome/Edge/Brave/Opera). Firefox + Safari are unsupported — surface this clearly in the UI.

Add an ESLint rule mirroring nns-dapp policy: only the hardware-ledger module may import `@zondax/ledger-icp` / `@ledgerhq/*`. Everything else must go through the hook/service layer. This keeps the heavy WebHID code dynamically split out of the main bundle.

---

## 3. Module layout (target)

Co-locate everything under `src/governance-app-frontend/src/features/hardwareWallet/` plus low-level identity code under `src/common/identity/`. Tree:

```
src/
├─ common/
│  ├─ identity/
│  │  ├─ secp256k1PublicKey.ts        ← port of keys/secp256k1.ts (no changes needed)
│  │  ├─ ledgerIdentity.ts            ← port of identities/ledger.identity.ts
│  │  ├─ ledgerIdentity.utils.ts      ← port of utils/ledger.utils.ts (decodePublicKey, signatures, read-state paths)
│  │  └─ ledgerIdentity.errors.ts     ← port of types/ledger.errors.ts (LedgerErrorKey, LedgerErrorMessage)
│  ├─ constants/
│  │  ├─ ledgerDevice.ts              ← LEDGER_DEFAULT_DERIVE_PATH, LEDGER_SIGNATURE_LENGTH, LedgerConnectionState, ExtendedLedgerError
│  │  └─ ledgerAppVersions.ts         ← ALL_CANDID_TXS_VERSION etc.
│  └─ utils/
│     └─ smallerVersion.ts            ← port of utils/utils.ts:smallerVersion (already in @dfinity/utils — prefer that)
├─ features/
│  └─ hardwareWallet/
│     ├─ services/
│     │  └─ hardwareWallet.lazy.ts    ← dynamic import wrapper (the React equivalent of the Svelte "proxy")
│     ├─ hooks/
│     │  ├─ useConnectHardwareWallet.ts        ← TanStack useMutation → returns LedgerIdentity
│     │  ├─ useRegisterHardwareWallet.ts       ← useMutation → nns-dapp.register_hardware_wallet
│     │  ├─ useHardwareWalletNeurons.ts        ← useQuery (manual trigger) → list_neurons via HW identity
│     │  ├─ useShowAddressOnDevice.ts          ← useMutation
│     │  ├─ useGetLedgerIdentity.ts            ← useMutation that re-connects and verifies identifier match
│     │  └─ useAssertLedgerVersion.ts          ← helper
│     ├─ components/
│     │  ├─ AttachHardwareWalletDialog.tsx
│     │  ├─ HardwareWalletConnectButton.tsx
│     │  ├─ HardwareWalletConnectionState.tsx  ← idle / connecting / connected / wrong device UI
│     │  ├─ HardwareWalletInfo.tsx             ← shows principal & account-id of connected device
│     │  ├─ HardwareWalletNeuronsDialog.tsx    ← list neurons on device + actions
│     │  ├─ HardwareWalletAddHotkeyDialog.tsx  ← user-principal as hotkey
│     │  ├─ HardwareWalletShowAddressButton.tsx
│     │  └─ HardwareWalletErrorAlert.tsx       ← renders LedgerErrorKey → i18n
│     ├─ utils/
│     │  └─ isHardwareWalletAccount.ts
│     └─ types.ts
└─ i18n/en/hardwareWallet.json                ← new namespace
```

---

## 4. The `LedgerIdentity` class

This is the heart of the integration and must be ported **verbatim** apart from the imports — it implements agent-js's `SignIdentity` contract, and changing its behaviour will silently break consensus signatures. Specifically keep:

| Behaviour | Why it matters |
|---|---|
| `transformRequest` for both `call` and `read_state` endpoints | The IC agent uses this hook to delegate signing; if `read_state` is not handled separately, the Ledger device is asked to sign twice for one call and the user has to confirm twice. |
| `readStateMap` cache keyed by request id (hex) | Avoids the double-sign: the read-state signature is computed alongside the call signature via `signUpdateCall`, then replayed when agent-js issues the actual read_state request. |
| `requestsMatch` normalising key order before CBOR | CBOR encoding is order-sensitive — without this the cached signature won't be reused. |
| Public-key check inside `executeWithApp` (re-fetch from device, compare against the key the identity was constructed with) | Detects user swapping devices between operations. |
| `raiseIfVersionIsDeprecated` before any sign | Older app versions can't parse the new candid txs. |
| `neuronStakeFlag` / `flagUpcomingStakeNeuron()` | The Zondax library has a separate code path for stake-neuron transfers so the device displays the correct UI. **Must be set on the SAME `LedgerIdentity` instance that signs the next ledger transfer.** |
| Always open a fresh transport, do the work, then `transport.close()` in `finally` | WebHID does not multiplex; leaving the transport open blocks subsequent calls. |

React/TanStack adaptations needed in the port:

- **No Svelte `i18n` store.** Replace `get(i18n)` calls with a module-level i18n accessor: import `i18n` from `i18next` directly and call `i18n.t(($) => $.errors.hardwareWallet.*)`. This keeps the class framework-agnostic (it cannot use hooks).
- The class is **not** a React object — instantiate it inside mutations / event handlers, never inside render. Pass instances around via mutation results / refs.
- Keep the `private constructor` + static `create()` pattern.

---

## 5. Dynamic-import / code-splitting strategy

`@zondax/ledger-icp` + `@ledgerhq/hw-transport-webhid` together add ~200 KB gzipped and pull in `buffer`, `bip32-path`, etc. They must not land in the initial bundle. The Svelte app uses a `proxy` module; the React equivalent is a lazy service:

```ts
// features/hardwareWallet/services/hardwareWallet.lazy.ts
const load = () => import('@common/identity/ledgerIdentity');

export const connectHardwareWallet = async () => {
  const { LedgerIdentity } = await load();
  return LedgerIdentity.create();
};

export const getLedgerIdentityForAccount = async (accountId: string) => {
  const { LedgerIdentity } = await load();
  const identity = await LedgerIdentity.create();
  // verify the principal hashes to the expected account id
  // (port AccountIdentifier.fromPrincipal check from icp-ledger.services.ts)
  return identity;
};

export const isLedgerIdentity = async (identity: unknown) => {
  const { LedgerIdentity } = await load();
  return identity instanceof LedgerIdentity;
};
```

Hooks call only this lazy module — never import `LedgerIdentity` or `@zondax/*` statically. Verify with `npm run build && npx vite-bundle-visualizer` that `@zondax/ledger-icp` ends up in a separate chunk.

---

## 6. Hooks (TanStack Query)

### `useConnectHardwareWallet`
`useMutation` that calls `connectHardwareWallet()`. State machine for the UI:
- `idle` (mutation `isIdle`)
- `connecting` (`isPending`)
- `connected` (`isSuccess` + `data: LedgerIdentity`)
- `error` (`isError` + mapped `LedgerErrorKey`)

The mutation **must be reset** when the dialog closes, otherwise stale `LedgerIdentity` instances leak. Use `useMutation({ ... })` plus an explicit `reset()` on close.

### `useRegisterHardwareWallet`
`useMutation({ mutationFn: async ({ name, ledgerIdentity }) => { … } })`:
1. Get nns-dapp canister via existing `useNnsDapp()` hook.
2. Call `canister.certifiedService.register_hardware_wallet({ name, principal: ledgerIdentity.getPrincipal() })`.
3. Inspect variant: `Ok | AccountNotFound | NameTooLong | HardwareWalletAlreadyRegistered | HardwareWalletLimitExceeded`. Map each to i18n keys (see `nns-dapp/frontend/src/lib/canisters/nns-dapp/nns-dapp.canister.ts:147`).
4. On success: `queryClient.invalidateQueries({ queryKey: ['nnsDappAccount'] })` (or whatever key `useNnsDappAccount` uses) so the new HW wallet appears in `useSubaccountsMetadata` / `useAccounts`.

### `useGetLedgerIdentity`
`useMutation` taking the **account identifier** of the already-registered HW wallet. It reconnects, computes `AccountIdentifier.fromPrincipal({ principal: ledgerIdentity.getPrincipal() }).toHex()` and throws `LedgerErrorMessage` if it doesn't match. Use this every time the user wants to sign with a known HW wallet account — never reuse a cached `LedgerIdentity` across user-initiated actions (the device may have been disconnected).

### `useHardwareWalletNeurons`
A query disabled by default that runs once on user click:
```ts
useQuery({
  queryKey: ['hwWalletNeurons', ledgerIdentity?.getPrincipal().toText()],
  enabled: false,
  queryFn: async () => {
    const { GovernanceCanister } = await import('@icp-sdk/canisters/nns');
    const governance = GovernanceCanister.create({ agent, canisterId });
    return governance.listNeurons({ certified: true, includeEmptyNeurons: undefined });
  },
});
```
The agent must be built from the `LedgerIdentity` (not from `useAgentPool`), because here the **HW identity is the caller**.  Build it ad-hoc via `createAgent({ identity: ledgerIdentity, host: NETWORK, fetchRootKey: IS_LOCAL })`.

### `useShowAddressOnDevice`
`useMutation` that calls `LedgerIdentity.create()` then `ledgerIdentity.showAddressAndPubKeyOnDevice()`. Don't keep the identity afterwards.

### `useAssertLedgerVersion`
Plain helper (not a hook). Wrapped by the staking/voting flows when the account is HW. Throws `LedgerErrorMessage` with the min version i18n key. Use the constants from `ledgerAppVersions.ts`.

---

## 7. Integration into existing flows

### 7.1 Accounts list (`features/accounts`)
`AccountType` needs a third variant `HardwareWallet`. Update:
- `features/accounts/types.ts`: extend the enum and the `AccountMetadata` shape to optionally carry the device principal.
- `features/accounts/hooks/useSubaccountsMetadata.ts`: today this only maps `sub_accounts`. Add a sibling map of `hardware_wallet_accounts` from `useNnsDappAccount` (the field already exists in `src/declarations/nns-dapp/nns-dapp.did.d.ts`).
- `useIcpLedgerAccountsBalances` already only needs account ids; HW wallets fit in as long as the id is passed.
- `AccountsListItem.tsx`: show a small "Ledger" badge for HW accounts (icon from `lucide-react` `Usb` or `Cable`).
- Add `isHardwareWalletAccount(account)` utility.

### 7.2 ICP transfer from a HW account (`features/account` send flow)
When the source account is a HW wallet:
1. Don't use the authenticated agent from `useAgentPool` for the transfer call.
2. Call `useGetLedgerIdentity({ accountId })` first.
3. `await assertLedgerVersion({ identity, minVersion: ALL_CANDID_TXS_VERSION })`.
4. Build a one-off agent: `createAgent({ identity: ledgerIdentity, host: NETWORK, fetchRootKey: IS_LOCAL })`.
5. Use it to construct `IcpLedgerCanister` and call `.transfer(...)`. The Ledger device will prompt the user.

Show a banner mid-flow: "Confirm on your Ledger device". Disable the form while the mutation is pending.

### 7.3 Stake neuron from a HW account
Mirror nns-dapp `services/neurons.services.ts:213` (`stakeNeuron`):
1. Get `ledgerIdentity` via `useGetLedgerIdentity`.
2. Call `ledgerIdentity.flagUpcomingStakeNeuron()` **immediately before** the transfer call (the flag is consumed by the next `sign`).
3. Use `ledgerIdentity` for the ledger transfer.
4. Use `AnonymousIdentity` (from `@icp-sdk/core/agent`) for the subsequent `claim_or_refresh` governance call — the Zondax app cannot sign governance update calls during the same sequence. See `getStakeNeuronPropsByAccount` in `neurons.services.ts:176-203` for why.
5. Controller is `ledgerIdentity.getPrincipal()`.

### 7.4 Manage / vote on a HW-controlled neuron
For any `manage_neuron` update call (vote, increase dissolve delay, disburse, follow, spawn, merge, change visibility, etc.) when the neuron's controller is a registered HW principal: re-enter `useGetLedgerIdentity` for that account, build a fresh agent off it, call governance. Each call requires a fresh device confirmation; warn the user up front.

### 7.5 Add user principal as hotkey
Convenience flow so the user can vote etc. from their II identity afterwards:
1. Connect HW (`useGetLedgerIdentity`).
2. List its neurons (`useHardwareWalletNeurons`).
3. For each selected neuron: call `governance.addHotKey({ neuronId, principal: iiIdentity.getPrincipal() })` signed by the HW identity. Multiple device confirmations.
4. After success, instruct user to refresh — they can now vote with II.

### 7.6 Verify address on device
`HardwareWalletShowAddressButton` → calls `useShowAddressOnDevice`. The dialog should explain "Compare the address shown on your device with the one displayed here."

---

## 8. Error handling and i18n

Port `ledger.errors.ts`:

```ts
export class LedgerErrorKey extends Error {
  constructor(public readonly i18nKey: string, public readonly substitutions?: Record<string, string>, public readonly renderAsHtml = false) {
    super(i18nKey);
  }
}
export class LedgerErrorMessage extends Error {} // pre-formatted user-facing string
```

In hooks, surface errors via `sonner` toasts (`toast.error(...)`). A small helper:

```ts
const showLedgerError = (err: unknown) => {
  if (err instanceof LedgerErrorKey) {
    return toast.error(t(($) => $.errors.hardwareWallet[err.i18nKey], err.substitutions));
  }
  if (err instanceof LedgerErrorMessage) {
    return toast.error(err.message);
  }
  return toast.error(t(($) => $.errors.hardwareWallet.unexpected));
};
```

Add a new translation namespace `i18n/en/hardwareWallet.json` and copy the keys from nns-dapp's `frontend/src/lib/i18n/en.json` under `error__ledger.*`, `error__attach_wallet.*`, `accounts.connect_hardware_wallet*`. Required keys (non-exhaustive):

- `error.appNotOpen` / `error.locked` / `error.userRejectedTransaction`
- `error.appVersionNotSupported` (substitution: `$minVersion`, `$currentVersion`)
- `error.browserNotSupported`
- `error.connectNoDevice` / `error.connectManyApps`
- `error.unexpectedWallet` (different device than registered)
- `error.incorrectIdentifier` (account-id mismatch on re-connect)
- `attach.alreadyRegistered` / `attach.limitExceeded` / `attach.nameTooLong` (substitution: `$accountName`) / `attach.noName` / `attach.noIdentity`
- `cta.connectHardwareWallet` / `cta.confirmOnDevice` / `info.unsupportedBrowserWarning`

---

## 9. Browser-support gate

Before rendering any "Connect" UI, check `'hid' in navigator`. If not present, render an explanatory banner with the supported browser list rather than letting the connect attempt fail. This was a frequent support issue on nns-dapp.

```ts
export const isWebHidSupported = () => typeof navigator !== 'undefined' && 'hid' in navigator;
```

---

## 10. Build / Vite configuration

`vite.config.js`:

```js
export default defineConfig({
  resolve: {
    alias: { buffer: 'buffer' },
  },
  define: {
    global: 'globalThis', // some @ledgerhq packages reference `global`
  },
  optimizeDeps: {
    include: ['buffer'],
    exclude: ['@zondax/ledger-icp', '@ledgerhq/hw-transport-webhid'],
  },
});
```

`tsconfig.json`: no changes expected — the imports are dynamic so they don't fight `isolatedModules`. **Keep** the existing `isolatedModules: true`; the ported `LedgerIdentity` already works around the `const enum` issue with the literal string `"read_state"` (see comment in `ledger.identity.ts:428-429`).

Also: `@zondax/ledger-icp` is shipped as ESM with some CJS interop quirks. If you see `default is not a constructor` at runtime, the dynamic import must use `(await import('@zondax/ledger-icp')).default` rather than a named import — same pattern as nns-dapp `ledger.identity.ts:204`.

---

## 11. Testing strategy

### Unit
- `Secp256k1PublicKey`: round-trip raw → DER → raw; reject wrong length; reject mismatched prefix. (Port `tests/lib/keys/secp256k1.spec.ts`.)
- `decodePublicKey` / `decodeSignature` / `decodeUpdateSignatures`: feed canned Zondax responses (success, `TransactionRejected`, `AppNotOpen`, `CannotFetchPublicKey`, principal mismatch).
- `LedgerIdentity`: mock the static `connect()` to return a fake `app` whose methods return canned responses, then exercise:
  - `transformRequest` for a `call` request: produces both call + read-state signatures, caches read-state.
  - Subsequent `transformRequest` for the same `read_state` body: hits cache (no `signUpdateCall` re-call).
  - `requestsMatch` ignores key order.
  - `executeWithApp` throws `unexpected_wallet` when the device public key changes between calls.
  - `flagUpcomingStakeNeuron` is consumed after one `sign` and not the next.

### Integration / hook tests
- `useRegisterHardwareWallet`: mock `useNnsDapp` to return a fake actor; assert each error variant maps to the right toast key.
- `useGetLedgerIdentity`: mock the lazy module; assert account-id mismatch throws `incorrectIdentifier`.

### E2E (Playwright)
Cannot use a real device in CI. Recommended approach: keep the WebHID transport behind the lazy import and inject a test transport via a `window.__hwLedgerTransportOverride` hook gated on `import.meta.env.DEV`. Then Playwright can drive scripted device responses end-to-end.

Minimum manual smoke tests against a real device (one-time per release):
1. Attach wallet → appears in accounts list.
2. Verify address on device.
3. Send ICP from HW wallet.
4. Stake neuron from HW wallet (this is the path that uses `flagUpcomingStakeNeuron`; regressions here are silent — the device will display the wrong screen).
5. Add II principal as hotkey on a HW-controlled neuron.
6. Vote with HW identity.

---

## 12. Suggested implementation order

1. **Foundations** (no UI yet). Port `secp256k1PublicKey.ts`, `ledgerIdentity.errors.ts`, constants, `ledgerIdentity.utils.ts`, `ledgerIdentity.ts`. Land unit tests for `Secp256k1PublicKey` + signature decoding. **No UI consumers yet** — just compiles and tests pass.
2. **Lazy service + hooks shell.** `hardwareWallet.lazy.ts`, `useConnectHardwareWallet`, `useShowAddressOnDevice`. Verify code-splitting via bundle-visualizer.
3. **Attach flow.** `AttachHardwareWalletDialog` + `useRegisterHardwareWallet`. Wire into accounts feature. Now you can register a wallet end-to-end.
4. **Accounts list integration.** Surface registered HW wallets in `useAccounts`, balances, badges, account detail page.
5. **Get-identity-for-account + send flow.** `useGetLedgerIdentity`, integrate into ICP transfer.
6. **Stake neuron from HW.** This is the riskiest path because of `flagUpcomingStakeNeuron` — pair it with a manual device test before merging.
7. **List HW neurons + add hotkey.** `useHardwareWalletNeurons`, `HardwareWalletNeuronsDialog`, `HardwareWalletAddHotkeyDialog`.
8. **Vote / manage existing HW neurons.** Audit every governance update call in the app and branch on HW controller.
9. **Polish.** Browser-support gate, error copy review, end-to-end device test against mainnet, code-split size check.

---

## 13. Known gotchas (carry forward from nns-dapp)

- **Don't cache `LedgerIdentity` across user gestures.** WebHID transports get invalidated when the user disconnects/reconnects. Always reconnect via `useGetLedgerIdentity` at the start of each action.
- **`transport.close()` in `finally`** — otherwise the next attempt errors with "cannot open device with path" which is reported as `connectManyApps`.
- **Buffer vs Uint8Array.** Zondax APIs take/return `Buffer`. Cast carefully — see `bufferToArrayBuffer` in `utils/ledger.utils.ts` for the correct slice-with-offsets pattern; the naïve `buffer.buffer` is wrong because Node Buffers share underlying ArrayBuffers.
- **`ingress_expiry` differs** between the call and the eventual read-state request because they're sent at different times. The cache uses the **cached** body's expiry; see `getRequestFromCache` in `ledger.identity.ts:290`. Do not "fix" this.
- **The stake-neuron flag is one-shot.** If you call `flagUpcomingStakeNeuron()` and then for any reason the next call is not the stake transfer (e.g. balance refresh sneaks in), the device shows the wrong screen and the staking call signs as a normal transfer. Keep the flag setter and the call adjacent and synchronous.
- **Account-id mismatch on reconnect** is a real and common failure mode (user plugged in a *different* device). Always recompute the account id from the freshly-fetched public key and compare to the stored identifier before signing anything destructive.

---

## 14. Out of scope (explicitly)

- Ledger Nano S support — Zondax dropped it; the app version check (`ALL_CANDID_TXS_VERSION = 2.4.9`) is the cutoff.
- Bluetooth transport (`@ledgerhq/hw-transport-web-ble`). WebHID only.
- SNS token transfers from HW wallet. nns-dapp supports SNS but governance-app may not yet — defer.
- Removing/renaming a registered HW wallet (the nns-dapp backend supports it but it's a small follow-up).
