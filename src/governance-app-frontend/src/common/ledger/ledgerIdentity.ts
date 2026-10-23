import {
  type CallRequest,
  Cbor,
  type HttpAgentReadStateRequest,
  type HttpAgentRequest,
  type PublicKey,
  type ReadRequest,
  type ReadRequestType,
  type ReadStateRequest,
  type RequestId,
  requestIdOf,
  type Signature,
  SignIdentity,
} from '@icp-sdk/core/agent';
import { isNullish, nonNullish, smallerVersion, uint8ArrayToHexString } from '@dfinity/utils';
import type {
  DeviceManagementKit,
  DeviceSessionId,
  DiscoveredDevice,
} from '@ledgerhq/device-management-kit';
import type LedgerApp from '@zondax/ledger-icp';
import type { ResponseAddress, ResponseVersion } from '@zondax/ledger-icp';

import { LEDGER_DEFAULT_DERIVE_PATH, LEDGER_MIN_APP_VERSION } from './constants';
import { type DmkErrorLike, LedgerDeviceError, LedgerErrorCode } from './errors';
import {
  assertResponseOk,
  createReadStatePaths,
  decodePublicKey,
  decodeSignature,
  decodeUpdateSignatures,
  getRequestId,
  type RequestSignatures,
} from './ledgerUtils';
import type { Secp256k1PublicKey } from './secp256k1';
import { ensureBuffer } from './webhid';

/** How long to wait for a device the user already allowed before the browser asks for one. */
const KNOWN_DEVICE_TIMEOUT_MS = 500;

/**
 * How long the device session stays open after the last action.
 * Actions that follow each other reuse the session. The kit does not wait for the device to
 * close, so a reconnect right after a disconnect can hit a device that is still closing.
 */
const SESSION_IDLE_TIMEOUT_MS = 5_000;

type Connection = {
  app: LedgerApp;
  /** The id of the connected device, to reconnect to the same one later. */
  deviceId: string;
  /** Gives the device session back. The session closes after the idle timeout. */
  release: () => void;
  /** The last Device Management Kit error the transport saw, if any. */
  transportError: () => DmkErrorLike | undefined;
};

type Session = {
  id: DeviceSessionId;
  deviceId: string;
  /** The number of actions that use the session. */
  users: number;
  idleTimer?: ReturnType<typeof setTimeout>;
};

// One Device Management Kit per page. It owns the WebHID transport and the device sessions.
let deviceManagementKit: Promise<DeviceManagementKit> | undefined;

// The device session that actions share while one follows the other.
let session: Session | undefined;

type ReadStateData = {
  signature: Signature;
  body: ReadStateRequest;
};

/**
 * An identity whose private key lives on a Ledger device.
 *
 * Every device interaction takes the shared device session and gives it back after the call.
 * The session closes a few seconds after the last action, so no other application is locked
 * out for long. agent-js calls `transformRequest`
 * for every request; a `call` request is signed together with its `read_state` request in
 * one device approval, and the `read_state` signature is cached for the status polling.
 *
 * Ported from nns-dapp (`frontend/src/lib/identities/ledger.identity.ts`).
 */
export class LedgerIdentity extends SignIdentity {
  // Set before the ICP transfer that creates a neuron. The device shows a "stake" screen.
  private neuronStakeFlag = false;

  // Signed `read_state` requests, by the request id of the `call` they belong to.
  // Entries are never removed. Each one costs a manual approval, so the map stays small.
  private readonly readStateMap = new Map<string, ReadStateData>();

  // The device this identity last answered from. Preferred when several devices are allowed.
  private deviceId: string | undefined;

  protected constructor(
    private readonly derivePath: string,
    private readonly publicKey: Secp256k1PublicKey,
    deviceId?: string,
  ) {
    super();
    this.deviceId = deviceId;
  }

  public static async create(
    derivePath: string = LEDGER_DEFAULT_DERIVE_PATH,
  ): Promise<LedgerIdentity> {
    const { app, deviceId, release, transportError } = await this.connect();

    try {
      const publicKey = await this.fetchPublicKeyFromDevice({ app, derivePath });

      return new this(derivePath, publicKey, deviceId);
    } catch (error: unknown) {
      throw LedgerIdentity.normalizeError(transportError() ?? error);
    } finally {
      release();
    }
  }

  public override getPublicKey(): Required<PublicKey> {
    return this.publicKey;
  }

  /** Signals that the next transaction is the ICP transfer that creates a neuron. */
  public flagUpcomingStakeNeuron(): void {
    this.neuronStakeFlag = true;
  }

  /** Shows the principal and the account identifier on the device so the user can verify them. */
  public async showAddressAndPubKeyOnDevice(): Promise<ResponseAddress> {
    // Not destructured: `showAddressAndPubKey` reads `this.transport` internally.
    return this.executeWithApp(async (app) => {
      const response = await app.showAddressAndPubKey(this.derivePath);
      assertResponseOk(response);

      return response;
    });
  }

  /**
   * The version of the Internet Computer app on the device.
   * `targetId` starts with the device model: 3300 Nano X, 3310 Nano S+, 3320 Stax, 3330 Flex.
   */
  public async getVersion(): Promise<ResponseVersion> {
    return this.executeWithApp(async (app) => {
      const response = await app.getVersion();
      assertResponseOk(response, LedgerErrorCode.Locked);

      return response;
    });
  }

  public override async sign(blob: Uint8Array): Promise<Signature> {
    const txType = this.consumeStakeFlag();

    return this.executeWithApp(async (app) => {
      await LedgerIdentity.assertAppVersion(app);
      const response = await app.sign(this.derivePath, Buffer.from(blob), txType);

      return decodeSignature(response);
    });
  }

  // The flag is one-shot. It is cleared before any asynchronous work, so a failed attempt
  // does not leak the stake mode into the next transaction.
  private consumeStakeFlag(): 0 | 1 {
    const txType = this.neuronStakeFlag ? 1 : 0;
    this.neuronStakeFlag = false;

    return txType;
  }

  /**
   * agent-js hook. Replaces the default signing with the device signing.
   * Without it the device answers "27012 - Data is invalid : Unexpected data type".
   */
  public override async transformRequest(
    request: HttpAgentRequest,
  ): Promise<Record<string, unknown>> {
    // `Endpoint` is a const enum in agent-js and cannot be imported as a value.
    if (request.endpoint === 'read_state') {
      const cachedRequest = this.getRequestFromCache(request);
      if (nonNullish(cachedRequest)) return cachedRequest;
    }

    if (request.endpoint === 'call') {
      return this.createSignAndStoreCallRequests(request);
    }

    const { body, ...fields } = request;

    return {
      ...fields,
      body: {
        content: body,
        sender_pubkey: this.publicKey.toDer(),
        sender_sig: await this.sign(this.prepareCborForLedger(body)),
      },
    };
  }

  // Public so tests can stub the kit.
  public static async getDeviceManagementKit(): Promise<DeviceManagementKit> {
    // The promise is cached, so two overlapping first calls build one kit.
    deviceManagementKit ??= (async () => {
      const [{ DeviceManagementKitBuilder }, { webHidTransportFactory }] = await Promise.all([
        import('@ledgerhq/device-management-kit'),
        import('@ledgerhq/device-transport-kit-web-hid'),
      ]);

      return new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build();
    })();

    return deviceManagementKit;
  }

  // A device the user already allowed is reused, so the browser asks for a device only once.
  // With several allowed devices and no preferred one, the browser asks the user to choose.
  private static async findDevice(
    dmk: DeviceManagementKit,
    preferredDeviceId?: string,
  ): Promise<DiscoveredDevice> {
    const { filter, firstValueFrom, timeout, TimeoutError } = await import('rxjs');

    let devices: DiscoveredDevice[] = [];
    try {
      devices = await firstValueFrom(
        dmk.listenToAvailableDevices({}).pipe(
          filter((available) => available.length > 0),
          timeout({ first: KNOWN_DEVICE_TIMEOUT_MS }),
        ),
      );
    } catch (error: unknown) {
      if (!(error instanceof TimeoutError)) throw error;
    }

    const preferred = devices.find(({ id }) => id === preferredDeviceId);
    if (nonNullish(preferred)) return preferred;
    if (devices.length === 1) return devices[0];

    return firstValueFrom(dmk.startDiscovering({}));
  }

  // Reuses the shared session when it is alive and on the right device, else opens one.
  private static async openSession(
    dmk: DeviceManagementKit,
    preferredDeviceId?: string,
  ): Promise<Session> {
    const current = session;
    if (nonNullish(current)) clearTimeout(current.idleTimer);

    // The device choice comes first, so a warm session on another device is not reused by
    // mistake when several devices are allowed.
    const device = await this.findDevice(dmk, preferredDeviceId);

    if (nonNullish(current)) {
      // The kit ends the session when the device disconnects.
      const alive = dmk.listConnectedDevices().some(({ sessionId }) => sessionId === current.id);

      if (alive && device.id === current.deviceId) {
        current.users += 1;

        return current;
      }

      if (!alive || current.users === 0) {
        session = undefined;
        if (alive) await LedgerIdentity.disconnectSession(dmk, current.id);
      }
    }

    const id = await dmk.connect({
      device,
      // The refresher polls the device between the APDUs of a multi-chunk signature.
      sessionRefresherOptions: { isRefresherDisabled: true },
    });
    const opened: Session = { id, deviceId: device.id, users: 1 };
    // A session on another device, while the shared one is in use, is not shared.
    if (isNullish(session)) session = opened;

    return opened;
  }

  private static releaseSession(dmk: DeviceManagementKit, released: Session): void {
    released.users -= 1;
    if (released.users > 0) return;

    if (released !== session) {
      void LedgerIdentity.disconnectSession(dmk, released.id);

      return;
    }

    released.idleTimer = setTimeout(() => {
      if (session === released) session = undefined;
      void LedgerIdentity.disconnectSession(dmk, released.id);
    }, SESSION_IDLE_TIMEOUT_MS);
  }

  // A failed disconnect must not replace the result or the error of the action itself.
  private static async disconnectSession(
    dmk: DeviceManagementKit,
    sessionId: DeviceSessionId,
  ): Promise<void> {
    try {
      await dmk.disconnect({ sessionId });
    } catch (error: unknown) {
      console.warn('Failed to disconnect the Ledger device.', error);
    }
  }

  /** Closes the shared device session now, for example on logout. */
  public static async closeSession(): Promise<void> {
    const current = session;
    if (isNullish(current) || isNullish(deviceManagementKit)) return;

    clearTimeout(current.idleTimer);
    session = undefined;
    await LedgerIdentity.disconnectSession(await deviceManagementKit, current.id);
  }

  // Public so tests can stub the device.
  public static async connect(preferredDeviceId?: string): Promise<Connection> {
    try {
      // The Ledger app packages read `Buffer` from the global scope.
      await ensureBuffer();
      // Every module loads before the session opens, so a failed import leaves no open device.
      const [dmk, { default: InternetComputerApp }, { DMKTransport }] = await Promise.all([
        this.getDeviceManagementKit(),
        import('@zondax/ledger-icp'),
        import('@zondax/ledger-js'),
      ]);

      if (!dmk.isEnvironmentSupported()) {
        throw new LedgerDeviceError(LedgerErrorCode.BrowserNotSupported);
      }

      const opened = await this.openSession(dmk, preferredDeviceId);
      const release = () => LedgerIdentity.releaseSession(dmk, opened);

      try {
        const transport = new DMKTransport(dmk, opened.id);
        // The adapter wraps a kit failure in a response error, and the app then answers with a
        // generic error response. The kit error is kept here so the action can report its code.
        let lastDmkError: DmkErrorLike | undefined;
        const send = transport.send;
        transport.send = async (...args) => {
          try {
            return await send(...args);
          } catch (error: unknown) {
            const { cause } = (error ?? {}) as { cause?: DmkErrorLike };
            if (nonNullish(cause?._tag)) lastDmkError = cause;
            throw error;
          }
        };

        return {
          app: new InternetComputerApp(transport),
          deviceId: opened.deviceId,
          release,
          transportError: () => lastDmkError,
        };
      } catch (error: unknown) {
        release();
        throw error;
      }
    } catch (error: unknown) {
      throw LedgerIdentity.mapConnectError(error);
    }
  }

  private static mapConnectError(error: unknown): LedgerDeviceError {
    if (error instanceof LedgerDeviceError) return error;

    const { _tag: tag } = (error ?? {}) as DmkErrorLike;

    // The user closed the browser device picker, or the browser has no WebHID.
    if (tag === 'NoAccessibleDeviceError') {
      return new LedgerDeviceError(LedgerErrorCode.AccessDenied);
    }

    if (tag === 'WebHidTransportNotSupportedError' || tag === 'TransportNotSupportedError') {
      return new LedgerDeviceError(LedgerErrorCode.BrowserNotSupported);
    }

    if (tag === 'UnknownDeviceError' || tag === 'DeviceNotRecognizedError') {
      return new LedgerDeviceError(LedgerErrorCode.NoDevice);
    }

    // The browser cannot open a device that another application uses.
    if (tag === 'OpeningConnectionError' || tag === 'ConnectionOpeningError') {
      return new LedgerDeviceError(LedgerErrorCode.OtherAppOpen);
    }

    return new LedgerDeviceError(LedgerErrorCode.ConnectFailed, { error: `${error}` });
  }

  // Public so tests can stub the device.
  public static async fetchPublicKeyFromDevice({
    app,
    derivePath,
  }: {
    app: LedgerApp;
    derivePath: string;
  }): Promise<Secp256k1PublicKey> {
    return decodePublicKey(await app.getAddressAndPubKey(derivePath));
  }

  private async executeWithApp<T>(callback: (app: LedgerApp) => Promise<T>): Promise<T> {
    const { app, deviceId, release, transportError } = await LedgerIdentity.connect(this.deviceId);

    try {
      const devicePublicKey = await LedgerIdentity.fetchPublicKeyFromDevice({
        app,
        derivePath: this.derivePath,
      });

      if (
        uint8ArrayToHexString(devicePublicKey.toRaw()) !==
        uint8ArrayToHexString(this.publicKey.toRaw())
      ) {
        throw new LedgerDeviceError(LedgerErrorCode.UnexpectedDevice);
      }
      this.deviceId = deviceId;

      return await callback(app);
    } catch (error: unknown) {
      throw LedgerIdentity.normalizeError(transportError() ?? error);
    } finally {
      release();
    }
  }

  // Every failure of a device action leaves the module as a `LedgerDeviceError`.
  private static normalizeError(error: unknown): LedgerDeviceError {
    if (error instanceof LedgerDeviceError) return error;

    const { _tag: tag = '' } = (error ?? {}) as DmkErrorLike;
    if (tag.includes('Disconnected') || tag === 'DeviceSessionNotFound') {
      return new LedgerDeviceError(LedgerErrorCode.Disconnected);
    }

    if (tag === 'DeviceLockedError') {
      return new LedgerDeviceError(LedgerErrorCode.Locked);
    }

    return new LedgerDeviceError(LedgerErrorCode.Unexpected, { error: `${error}` });
  }

  // Runs on the open session, so the check and the signature share one device connection.
  private static async assertAppVersion(app: LedgerApp): Promise<void> {
    const response = await app.getVersion();
    assertResponseOk(response, LedgerErrorCode.Locked);

    const { major, minor, patch } = response;
    const currentVersion = `${major}.${minor}.${patch}`;

    if (
      isNullish(major) ||
      isNullish(minor) ||
      isNullish(patch) ||
      smallerVersion({ minVersion: LEDGER_MIN_APP_VERSION, currentVersion })
    ) {
      throw new LedgerDeviceError(LedgerErrorCode.AppVersionNotSupported, {
        version: currentVersion,
        minVersion: LEDGER_MIN_APP_VERSION,
      });
    }
  }

  private async signWithReadState(
    callBlob: Uint8Array,
    readStateBlob: Uint8Array,
  ): Promise<RequestSignatures> {
    const txType = this.consumeStakeFlag();

    return this.executeWithApp(async (app) => {
      await LedgerIdentity.assertAppVersion(app);
      const response = await app.signUpdateCall(
        this.derivePath,
        Buffer.from(callBlob),
        Buffer.from(readStateBlob),
        txType,
      );

      return decodeUpdateSignatures(response);
    });
  }

  private async createSignAndStoreCallRequests(
    request: HttpAgentRequest,
  ): Promise<Record<string, unknown>> {
    const { body, ...fields } = request;
    const callBody = body as CallRequest;
    const { requestId, readStateBody } = this.createReadStateRequest(callBody);
    const signatures = await this.signWithReadState(
      this.prepareCborForLedger(callBody),
      this.prepareCborForLedger(readStateBody),
    );

    this.readStateMap.set(uint8ArrayToHexString(requestId), {
      signature: signatures.readStateSignature,
      body: readStateBody,
    });

    return {
      ...fields,
      body: {
        content: callBody,
        sender_pubkey: this.publicKey.toDer(),
        sender_sig: signatures.callSignature,
      },
    };
  }

  private createReadStateRequest(body: CallRequest): {
    readStateBody: ReadStateRequest;
    requestId: RequestId;
  } {
    const requestId = requestIdOf(body);
    const readStateBody: ReadStateRequest = {
      // `ReadRequestType` is a const enum in agent-js and cannot be imported as a value.
      request_type: 'read_state' as ReadRequestType.ReadState,
      paths: createReadStatePaths(requestId),
      ingress_expiry: body.ingress_expiry,
      sender: body.sender,
    };

    return { readStateBody, requestId };
  }

  private getRequestFromCache(
    request: HttpAgentReadStateRequest,
  ): Record<string, unknown> | undefined {
    const { body, ...fields } = request;
    const requestId = getRequestId(body);
    // Only a call status request has a cached signature. Any other `read_state` request
    // (for example the `time` path) is signed on the device.
    if (isNullish(requestId)) return undefined;

    const requestIdHex = uint8ArrayToHexString(requestId);
    const cached = this.readStateMap.get(requestIdHex);

    if (isNullish(cached)) {
      console.warn(`No cached data for read state request with id ${requestIdHex}.`);
      return undefined;
    }

    // agent-js builds the polling request later, so its `ingress_expiry` differs from the
    // one the device signed. The signature is only valid for the cached body.
    const newBody = { ...body, ingress_expiry: cached.body.ingress_expiry };
    if (!this.requestsMatch(cached.body, newBody)) {
      console.warn("Cached request doesn't match read state request.");
      return undefined;
    }

    return {
      ...fields,
      body: {
        content: cached.body,
        sender_pubkey: this.publicKey.toDer(),
        sender_sig: cached.signature,
      },
    };
  }

  private prepareCborForLedger(request: ReadRequest | CallRequest): Uint8Array {
    return Cbor.encode({ content: request });
  }

  // CBOR encoding depends on the property order, so both requests are sorted first.
  private requestsMatch(request1: ReadRequest, request2: ReadRequest): boolean {
    const sortKeys = (request: ReadRequest): ReadRequest =>
      Object.fromEntries(
        Object.keys(request)
          .sort()
          .map((key) => [key, request[key]]),
      ) as ReadRequest;

    return (
      uint8ArrayToHexString(this.prepareCborForLedger(sortKeys(request1))) ===
      uint8ArrayToHexString(this.prepareCborForLedger(sortKeys(request2)))
    );
  }
}
