import {
  type Endpoint,
  Expiry,
  type HttpAgentRequest,
  type ReadRequest,
  type ReadRequestType,
  requestIdOf,
  type SubmitRequestType,
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import type TransportWebHID from '@ledgerhq/hw-transport-webhid';
import type InternetComputerApp from '@zondax/ledger-icp';
import type { ResponseVersion } from '@zondax/ledger-icp';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { mockLedgerPublicKey } from '../../../tests/mocks/ledgerIdentity';
import { LEDGER_SIGNATURE_LENGTH, LedgerReturnCode } from './constants';
import { LedgerErrorCode } from './errors';
import { LedgerIdentity } from './ledgerIdentity';
import { getRequestId } from './ledgerUtils';

type MockApp = {
  getAddressAndPubKey: Mock;
  getVersion: Mock;
  sign: Mock;
  signUpdateCall: Mock;
  showAddressAndPubKey: Mock;
};

const version = (overrides: Partial<ResponseVersion> = {}): ResponseVersion => ({
  errorMessage: 'No errors',
  returnCode: LedgerReturnCode.NoErrors,
  major: 3,
  minor: 0,
  patch: 0,
  deviceLocked: false,
  targetId: '33000004',
  testMode: false,
  ...overrides,
});

describe('LedgerIdentity', () => {
  const sender = Principal.fromText(
    'xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe',
  );
  const canisterId = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

  const callBody = {
    request_type: 'call' as SubmitRequestType.Call,
    canister_id: canisterId,
    method_name: 'get_balance',
    arg: new Uint8Array(),
    sender,
    ingress_expiry: Expiry.fromDeltaInMilliseconds(100000),
  };
  const callRequest: HttpAgentRequest = {
    endpoint: 'call' as Endpoint.Call,
    request: {},
    body: callBody,
  };
  const requestId = requestIdOf(callBody);
  const readStateRequest: HttpAgentRequest = {
    endpoint: 'read_state' as Endpoint.ReadState,
    request: {},
    body: {
      request_type: 'read_state' as ReadRequestType.ReadState,
      paths: [[new TextEncoder().encode('request_status'), requestId]],
      sender,
      // agent-js builds the polling request later, so its expiry differs from the signed one.
      ingress_expiry: Expiry.fromDeltaInMilliseconds(200000),
    },
  };

  let app: MockApp;
  let transport: { close: Mock };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    app = {
      getAddressAndPubKey: vi.fn(),
      getVersion: vi.fn().mockResolvedValue(version()),
      sign: vi.fn().mockResolvedValue({
        errorMessage: 'No errors',
        returnCode: LedgerReturnCode.NoErrors,
        signatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH),
      }),
      signUpdateCall: vi.fn().mockResolvedValue({
        errorMessage: 'No errors',
        returnCode: LedgerReturnCode.NoErrors,
        RequestSignatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 1),
        StatusReadSignatureRS: Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 2),
      }),
      showAddressAndPubKey: vi.fn(),
    };
    transport = { close: vi.fn().mockResolvedValue(undefined) };

    vi.spyOn(LedgerIdentity, 'connect').mockResolvedValue({
      app: app as unknown as InternetComputerApp,
      transport: transport as unknown as Awaited<ReturnType<typeof TransportWebHID.create>>,
    });
    vi.spyOn(LedgerIdentity, 'fetchPublicKeyFromDevice').mockResolvedValue(mockLedgerPublicKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the principal from the device public key', async () => {
    const identity = await LedgerIdentity.create();

    expect(identity.getPrincipal().toText()).toBe(
      Principal.selfAuthenticating(mockLedgerPublicKey.toDer()).toText(),
    );
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it('signs the call and the read state together, then reuses the read state signature', async () => {
    const identity = await LedgerIdentity.create();

    const request = await identity.transformRequest(callRequest);
    expect(app.signUpdateCall).toHaveBeenCalledTimes(1);
    expect(app.sign).not.toHaveBeenCalled();
    expect(request.endpoint).toBe('call');

    const readRequest = await identity.transformRequest(readStateRequest);
    expect(app.signUpdateCall).toHaveBeenCalledTimes(1);
    expect(app.sign).not.toHaveBeenCalled();
    expect(readRequest.endpoint).toBe('read_state');
  });

  it('passes the stake flag once and clears it', async () => {
    const identity = await LedgerIdentity.create();

    identity.flagUpcomingStakeNeuron();
    await identity.transformRequest(callRequest);
    expect(app.signUpdateCall).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.any(Buffer),
      1,
    );

    await identity.transformRequest(callRequest);
    expect(app.signUpdateCall).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.any(Buffer),
      0,
    );
  });

  it('signs every new call request', async () => {
    const identity = await LedgerIdentity.create();

    await identity.transformRequest(callRequest);
    await identity.transformRequest(callRequest);

    expect(app.signUpdateCall).toHaveBeenCalledTimes(2);
  });

  it('closes the transport after each device call', async () => {
    const identity = await LedgerIdentity.create();

    await identity.transformRequest(callRequest);

    // create, getVersion, signUpdateCall
    expect(transport.close).toHaveBeenCalledTimes(3);
  });

  it('finds the cached read state regardless of the order of the calls', async () => {
    const callBody2 = { ...callBody, method_name: 'get_balance2' };
    const callRequest2: HttpAgentRequest = {
      endpoint: 'call' as Endpoint.Call,
      request: {},
      body: callBody2,
    };
    const requestId2 = requestIdOf(callBody2);
    const readStateRequest2: HttpAgentRequest = {
      ...readStateRequest,
      body: {
        ...readStateRequest.body,
        paths: [[new TextEncoder().encode('request_status'), requestId2]],
      },
    } as HttpAgentRequest;

    const identity = await LedgerIdentity.create();

    await identity.transformRequest(callRequest);
    await identity.transformRequest(callRequest2);
    expect(app.signUpdateCall).toHaveBeenCalledTimes(2);

    const readRequest2 = await identity.transformRequest(readStateRequest2);
    const readRequest1 = await identity.transformRequest(readStateRequest);
    expect(app.sign).not.toHaveBeenCalled();
    expect(app.signUpdateCall).toHaveBeenCalledTimes(2);

    const bodyOf = (request: Record<string, unknown>) =>
      (request.body as { content: ReadRequest }).content;
    expect(getRequestId(bodyOf(readRequest2))).toEqual(requestId2);
    expect(getRequestId(bodyOf(readRequest1))).toEqual(requestId);
  });

  it('signs a read state request that was never cached', async () => {
    const identity = await LedgerIdentity.create();

    const readRequest = await identity.transformRequest(readStateRequest);

    expect(app.sign).toHaveBeenCalledTimes(1);
    expect(app.signUpdateCall).not.toHaveBeenCalled();
    expect(readRequest.endpoint).toBe('read_state');
  });

  it('rejects a device with another public key', async () => {
    const identity = await LedgerIdentity.create();
    const otherKey = { toRaw: () => new Uint8Array(65) } as never;
    vi.spyOn(LedgerIdentity, 'fetchPublicKeyFromDevice').mockResolvedValue(otherKey);

    await expect(identity.getVersion()).rejects.toMatchObject({
      code: LedgerErrorCode.UnexpectedDevice,
    });
    expect(transport.close).toHaveBeenCalled();
  });

  describe('app version', () => {
    it('accepts the minimum version', async () => {
      app.getVersion.mockResolvedValue(version({ major: 2, minor: 4, patch: 9 }));
      const identity = await LedgerIdentity.create();

      await identity.transformRequest(callRequest);

      expect(app.signUpdateCall).toHaveBeenCalledTimes(1);
    });

    it('fails before signing when the app is older', async () => {
      app.getVersion.mockResolvedValue(version({ major: 2, minor: 4, patch: 8 }));
      const identity = await LedgerIdentity.create();

      await expect(identity.transformRequest(callRequest)).rejects.toMatchObject({
        code: LedgerErrorCode.AppVersionNotSupported,
        details: { version: '2.4.8', minVersion: '2.4.9' },
      });
      expect(app.signUpdateCall).not.toHaveBeenCalled();
    });

    it('fails before signing a stake transaction when the app is older', async () => {
      app.getVersion.mockResolvedValue(version({ major: 2, minor: 4, patch: 8 }));
      const identity = await LedgerIdentity.create();
      identity.flagUpcomingStakeNeuron();

      await expect(identity.transformRequest(callRequest)).rejects.toMatchObject({
        code: LedgerErrorCode.AppVersionNotSupported,
      });
      expect(app.sign).not.toHaveBeenCalled();
      expect(app.signUpdateCall).not.toHaveBeenCalled();
    });

    it('fails when the device reports no version', async () => {
      app.getVersion.mockResolvedValue(version({ major: undefined }));
      const identity = await LedgerIdentity.create();

      await expect(identity.transformRequest(callRequest)).rejects.toMatchObject({
        code: LedgerErrorCode.AppVersionNotSupported,
      });
    });
  });

  describe('connect errors', () => {
    const connectWith = async (error: unknown) => {
      vi.mocked(LedgerIdentity.connect).mockRestore();
      vi.spyOn(
        LedgerIdentity as unknown as { getTransport: () => Promise<unknown> },
        'getTransport',
      ).mockRejectedValue(error);

      return LedgerIdentity.connect();
    };

    it.each([
      [{ name: 'TransportOpenUserCancelled', message: 'cancelled' }, LedgerErrorCode.AccessDenied],
      [
        { name: 'TransportOpenUserCancelled', message: 'WebHID not supported' },
        LedgerErrorCode.BrowserNotSupported,
      ],
      [{ id: 'NoDeviceFound', message: '' }, LedgerErrorCode.NoDevice],
      [{ message: 'cannot open device with path 1' }, LedgerErrorCode.OtherAppOpen],
      [new Error('boom'), LedgerErrorCode.ConnectFailed],
    ])('maps %o to %s', async (error, code) => {
      await expect(connectWith(error)).rejects.toMatchObject({ code });
    });
  });
});
