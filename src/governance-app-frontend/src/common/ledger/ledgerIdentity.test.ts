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
import type { DiscoveredDevice } from '@ledgerhq/device-management-kit';
import type InternetComputerApp from '@zondax/ledger-icp';
import type { ResponseVersion } from '@zondax/ledger-icp';
import { NEVER, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { mockLedgerPublicKey } from '../../../tests/mocks/ledgerIdentity';
import { LEDGER_SIGNATURE_LENGTH, LedgerReturnCode } from './constants';
import { LedgerDeviceError, LedgerErrorCode } from './errors';
import { LedgerIdentity } from './ledgerIdentity';
import { getRequestId } from './ledgerUtils';

const mockAppConstructor = vi.hoisted(() => vi.fn());
vi.mock('@zondax/ledger-icp', () => ({ default: mockAppConstructor }));

const mockDmk = vi.hoisted(() => ({
  isEnvironmentSupported: vi.fn(),
  listenToAvailableDevices: vi.fn(),
  startDiscovering: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock('@ledgerhq/device-management-kit', () => ({
  DeviceManagementKitBuilder: class {
    addTransport() {
      return this;
    }
    build() {
      return mockDmk;
    }
  },
}));
vi.mock('@ledgerhq/device-transport-kit-web-hid', () => ({ webHidTransportFactory: vi.fn() }));

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
  let disconnect: Mock;

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
    disconnect = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(LedgerIdentity, 'connect').mockResolvedValue({
      app: app as unknown as InternetComputerApp,
      disconnect,
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
    expect(disconnect).toHaveBeenCalledTimes(1);
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

    // Each envelope carries its own signature and the device public key.
    const envelopeOf = (transformed: Record<string, unknown>) =>
      transformed.body as {
        content: { ingress_expiry: Expiry };
        sender_pubkey: Uint8Array;
        sender_sig: Uint8Array;
      };
    const callEnvelope = envelopeOf(request);
    const readStateEnvelope = envelopeOf(readRequest);
    expect(callEnvelope.content).toBe(callBody);
    expect(Array.from(callEnvelope.sender_sig)).toEqual(
      Array.from(Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 1)),
    );
    expect(Array.from(readStateEnvelope.sender_sig)).toEqual(
      Array.from(Buffer.alloc(LEDGER_SIGNATURE_LENGTH, 2)),
    );
    expect(Array.from(callEnvelope.sender_pubkey)).toEqual(Array.from(mockLedgerPublicKey.toDer()));
    expect(Array.from(readStateEnvelope.sender_pubkey)).toEqual(
      Array.from(mockLedgerPublicKey.toDer()),
    );

    // The polling request keeps the expiry the device signed, not the newer one from agent-js.
    expect(readStateEnvelope.content.ingress_expiry).toBe(callBody.ingress_expiry);
    expect(readStateEnvelope.content.ingress_expiry).not.toBe(readStateRequest.body.ingress_expiry);
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

  it('disconnects after each device call', async () => {
    const identity = await LedgerIdentity.create();

    await identity.transformRequest(callRequest);

    // create, getVersion, signUpdateCall
    expect(disconnect).toHaveBeenCalledTimes(3);
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

  it('clears the stake flag when a flagged attempt fails', async () => {
    app.getVersion.mockResolvedValueOnce(version({ major: 2, minor: 4, patch: 8 }));
    const identity = await LedgerIdentity.create();

    identity.flagUpcomingStakeNeuron();
    await expect(identity.transformRequest(callRequest)).rejects.toMatchObject({
      code: LedgerErrorCode.AppVersionNotSupported,
    });

    await identity.transformRequest(callRequest);
    expect(app.signUpdateCall).toHaveBeenCalledTimes(1);
    expect(app.signUpdateCall).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.any(Buffer),
      0,
    );
  });

  it.each([
    ['no path', []],
    ['the time path', [[new TextEncoder().encode('time')]]],
  ])('signs a read state request with %s on the device', async (_, paths) => {
    const identity = await LedgerIdentity.create();
    const request = {
      ...readStateRequest,
      body: { ...readStateRequest.body, paths },
    } as HttpAgentRequest;

    const readRequest = await identity.transformRequest(request);

    expect(app.sign).toHaveBeenCalledTimes(1);
    expect(app.signUpdateCall).not.toHaveBeenCalled();
    expect(readRequest.endpoint).toBe('read_state');
  });

  it('signs a read state request that was never cached', async () => {
    const identity = await LedgerIdentity.create();

    const readRequest = await identity.transformRequest(readStateRequest);

    expect(app.sign).toHaveBeenCalledTimes(1);
    expect(app.signUpdateCall).not.toHaveBeenCalled();
    expect(readRequest.endpoint).toBe('read_state');
  });

  describe('device answers with an error code', () => {
    it('maps a rejected address verification to UserRejected', async () => {
      const identity = await LedgerIdentity.create();
      app.showAddressAndPubKey.mockResolvedValue({
        errorMessage: 'Transaction rejected',
        returnCode: LedgerReturnCode.TransactionRejected,
      });

      await expect(identity.showAddressAndPubKeyOnDevice()).rejects.toMatchObject({
        code: LedgerErrorCode.UserRejected,
      });
    });

    it('returns a successful address verification', async () => {
      const identity = await LedgerIdentity.create();
      const response = { errorMessage: 'No errors', returnCode: LedgerReturnCode.NoErrors };
      app.showAddressAndPubKey.mockResolvedValue(response);

      await expect(identity.showAddressAndPubKeyOnDevice()).resolves.toEqual(response);
    });

    it('reports a failed version answer as a device error, not as an old app', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockResolvedValue({
        errorMessage: 'Unknown error',
        returnCode: LedgerReturnCode.UnknownError,
      });

      await expect(identity.transformRequest(callRequest)).rejects.toMatchObject({
        code: LedgerErrorCode.Unexpected,
        details: { error: `Unknown error (code ${LedgerReturnCode.UnknownError})` },
      });
      expect(app.signUpdateCall).not.toHaveBeenCalled();
    });

    it('maps a rejected version answer to Locked', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockResolvedValue({
        errorMessage: 'Transaction rejected',
        returnCode: LedgerReturnCode.TransactionRejected,
      });

      await expect(identity.getVersion()).rejects.toMatchObject({ code: LedgerErrorCode.Locked });
    });
  });

  describe('error normalization', () => {
    it('wraps a raw error from the public key exchange in create', async () => {
      vi.spyOn(LedgerIdentity, 'fetchPublicKeyFromDevice').mockRejectedValue(new Error('usb'));

      await expect(LedgerIdentity.create()).rejects.toMatchObject({
        code: LedgerErrorCode.Unexpected,
        details: { error: 'Error: usb' },
      });
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('wraps a raw error from a device callback', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockRejectedValue(new Error('apdu'));

      await expect(identity.getVersion()).rejects.toMatchObject({
        code: LedgerErrorCode.Unexpected,
        details: { error: 'Error: apdu' },
      });
      expect(disconnect).toHaveBeenCalledTimes(2);
    });

    it('maps a disconnected device', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockRejectedValue({ _tag: 'DeviceDisconnectedWhileSendingError' });

      await expect(identity.getVersion()).rejects.toMatchObject({
        code: LedgerErrorCode.Disconnected,
      });
    });

    it('ignores a failed disconnect after a successful action', async () => {
      const identity = await LedgerIdentity.create();
      disconnect.mockRejectedValue(new Error('already closed'));

      await expect(identity.getVersion()).resolves.toEqual(version());
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to disconnect the Ledger device.',
        expect.any(Error),
      );
    });

    it('keeps the action error when the disconnect fails too', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockRejectedValue(new LedgerDeviceError(LedgerErrorCode.Locked));
      disconnect.mockRejectedValue(new Error('already closed'));

      await expect(identity.getVersion()).rejects.toMatchObject({ code: LedgerErrorCode.Locked });
    });

    it('keeps an already decoded error', async () => {
      const identity = await LedgerIdentity.create();
      app.getVersion.mockRejectedValue(new LedgerDeviceError(LedgerErrorCode.Locked));

      await expect(identity.getVersion()).rejects.toMatchObject({ code: LedgerErrorCode.Locked });
      expect(app.getVersion).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects a device with another public key', async () => {
    const identity = await LedgerIdentity.create();
    const otherKey = { toRaw: () => new Uint8Array(65) } as never;
    vi.spyOn(LedgerIdentity, 'fetchPublicKeyFromDevice').mockResolvedValue(otherKey);

    await expect(identity.getVersion()).rejects.toMatchObject({
      code: LedgerErrorCode.UnexpectedDevice,
    });
    expect(disconnect).toHaveBeenCalled();
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

  describe('connect', () => {
    const sessionId = 'session-id';
    const device = { id: 'device-id' } as DiscoveredDevice;

    beforeEach(() => {
      vi.mocked(LedgerIdentity.connect).mockRestore();
      Object.values(mockDmk).forEach((fn) => fn.mockReset());
      mockAppConstructor.mockReset();
      mockDmk.isEnvironmentSupported.mockReturnValue(true);
      mockDmk.listenToAvailableDevices.mockReturnValue(of([device]));
      mockDmk.startDiscovering.mockReturnValue(of(device));
      mockDmk.connect.mockResolvedValue(sessionId);
      mockDmk.disconnect.mockResolvedValue(undefined);
      mockAppConstructor.mockImplementation(function () {
        return app;
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('connects to a device the user already allowed', async () => {
      const connection = await LedgerIdentity.connect();

      expect(connection.app).toBe(app);
      expect(mockDmk.startDiscovering).not.toHaveBeenCalled();
      expect(mockDmk.connect).toHaveBeenCalledWith({
        device,
        sessionRefresherOptions: { isRefresherDisabled: true },
      });
      expect(mockAppConstructor).toHaveBeenCalledWith(
        expect.objectContaining({ send: expect.any(Function) }),
      );
    });

    it('asks the browser for a device when the user allowed none', async () => {
      vi.useFakeTimers();
      mockDmk.listenToAvailableDevices.mockReturnValue(NEVER);

      const result = LedgerIdentity.connect();
      await vi.advanceTimersByTimeAsync(500);
      await result;

      expect(mockDmk.startDiscovering).toHaveBeenCalledTimes(1);
      expect(mockDmk.connect).toHaveBeenCalledWith({
        device,
        sessionRefresherOptions: { isRefresherDisabled: true },
      });
    });

    it('disconnects the session', async () => {
      const connection = await LedgerIdentity.connect();

      await connection.disconnect();

      expect(mockDmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    it('disconnects when the app cannot be built', async () => {
      mockAppConstructor.mockImplementation(function () {
        throw new Error('no app');
      });

      await expect(LedgerIdentity.connect()).rejects.toMatchObject({
        code: LedgerErrorCode.ConnectFailed,
        details: { error: 'Error: no app' },
      });
      expect(mockDmk.disconnect).toHaveBeenCalledWith({ sessionId });
    });

    it('fails when the browser has no WebHID', async () => {
      mockDmk.isEnvironmentSupported.mockReturnValue(false);

      await expect(LedgerIdentity.connect()).rejects.toMatchObject({
        code: LedgerErrorCode.BrowserNotSupported,
      });
      expect(mockDmk.connect).not.toHaveBeenCalled();
    });

    it('maps a closed device picker to AccessDenied', async () => {
      vi.useFakeTimers();
      mockDmk.listenToAvailableDevices.mockReturnValue(NEVER);
      mockDmk.startDiscovering.mockReturnValue(
        throwError(() => ({ _tag: 'NoAccessibleDeviceError' })),
      );

      const result = LedgerIdentity.connect();
      const assertion = expect(result).rejects.toMatchObject({
        code: LedgerErrorCode.AccessDenied,
      });
      await vi.advanceTimersByTimeAsync(500);
      await assertion;
    });

    it.each([
      [{ _tag: 'UnknownDeviceError' }, LedgerErrorCode.NoDevice],
      [{ _tag: 'OpeningConnectionError' }, LedgerErrorCode.OtherAppOpen],
      [{ _tag: 'WebHidTransportNotSupportedError' }, LedgerErrorCode.BrowserNotSupported],
      [new Error('boom'), LedgerErrorCode.ConnectFailed],
    ])('maps a connect failure %o to %s', async (error, code) => {
      mockDmk.connect.mockRejectedValue(error);

      await expect(LedgerIdentity.connect()).rejects.toMatchObject({ code });
    });
  });
});
