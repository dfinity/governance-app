#!/usr/bin/env node
// Creates a canister with a fixed ID on a running icp-cli managed network.
// `icp canister create` cannot choose the ID, so this script calls the PocketIC REST API directly.
//
// Usage: create-local-canister.mjs <network> <canister-id> <controller>

import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CYCLES = 100_000_000_000_000n;
const MAX_ATTEMPTS = 60;
const RETRY_DELAY_MS = 500;

const [network, canisterIdText, controllerText] = process.argv.slice(2);
if (!network || !canisterIdText || !controllerText) {
  console.error('Usage: create-local-canister.mjs <network> <canister-id> <controller>');
  process.exit(1);
}

const canisterId = Principal.fromText(canisterIdText);
const controller = Principal.fromText(controllerText);

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const descriptorPath = resolve(rootDir, '.icp/cache/networks', network, 'descriptor.json');
const descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8'));
const serverUrl = `http://127.0.0.1:${descriptor['pocketic-config-port']}`;
const instanceUrl = `${serverUrl}/instances/${descriptor['pocketic-instance-id']}`;

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');

const CreateArgs = IDL.Record({
  amount: IDL.Opt(IDL.Nat),
  settings: IDL.Opt(IDL.Null),
  specified_id: IDL.Opt(IDL.Principal),
});
const CreateResult = IDL.Record({ canister_id: IDL.Principal });

const sleep = () => new Promise((done) => setTimeout(done, RETRY_DELAY_MS));

const timeOut = (what) => {
  console.error(`Timed out on ${what} for ${canisterId.toText()}.`);
  process.exit(1);
};

// PocketIC answers 202 with a handle when it starts an operation. Poll the handle until done.
const pollOperation = async ({ state_label, op_id }) => {
  const url = `${serverUrl}/read_graph/${encodeURIComponent(state_label)}/${encodeURIComponent(op_id)}`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url);
    if (response.status !== 404) return { ok: response.ok, result: await response.json() };
    await sleep();
  }
  timeOut(`operation ${op_id}`);
};

// The network runs in live mode, so PocketIC answers 409 while it advances time. Retry until free.
const post = async (path, body) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${instanceUrl}/update/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.status === 202) return pollOperation(await response.json());
    if (response.status !== 409) return { ok: response.ok, result: await response.json() };
    await sleep();
  }
  timeOut(path);
};

// The sender becomes the only controller of the new canister.
const submitted = await post('submit_ingress_message', {
  sender: toBase64(controller.toUint8Array()),
  canister_id: toBase64(Principal.managementCanister().toUint8Array()),
  effective_principal: { CanisterId: toBase64(canisterId.toUint8Array()) },
  method: 'provisional_create_canister_with_cycles',
  payload: toBase64(
    IDL.encode([CreateArgs], [{ amount: [CYCLES], settings: [], specified_id: [canisterId] }]),
  ),
});
if (!submitted.ok || !submitted.result.Ok) {
  console.error('Failed to submit the create call:', JSON.stringify(submitted.result));
  process.exit(1);
}

const created = await post('await_ingress_message', submitted.result.Ok);
if (!created.ok || !created.result.Ok) {
  console.error('Failed to create the canister:', JSON.stringify(created.result));
  process.exit(1);
}

// Copy out of Node's shared Buffer pool: IDL.decode reads the whole underlying ArrayBuffer.
const reply = new Uint8Array(Buffer.from(created.result.Ok, 'base64'));
const [{ canister_id }] = IDL.decode([CreateResult], reply);
if (canister_id.toText() !== canisterId.toText()) {
  console.error(`Created ${canister_id.toText()} instead of ${canisterId.toText()}.`);
  process.exit(1);
}

console.log(`Created ${canisterId.toText()} with controller ${controller.toText()}.`);
