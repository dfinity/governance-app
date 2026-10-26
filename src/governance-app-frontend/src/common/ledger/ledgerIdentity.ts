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
  idleTimer?: ReturnType<typeof setTimeout>;
};

// One Device Management Kit per page. It owns the WebHID transport and the device sessions.
let deviceManagementKit: Promise<DeviceManagementKit> | undefined;

// The device session that actions share while one follows the other.
let session: Session | undefined;

// Device actions run one after the other. The lock is held from the connection to its release,
// so no command of a second action lands between the APDUs of a signature.
let actionLock: Promise<void> = Promise.resolve();

// Bumped when the session closes. An action queued before the close waits its turn again on
// the new queue, so it cannot overlap an action that started after the close.
let lockGeneration = 0;

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
    // The promise is cached, so two overlapping first calls build one kit. A failed build is
    // forgotten, so the next call tries again.
    deviceManagementKit ??= (async () => {
      const [{ DeviceManagementKitBuilder }, { webHidTransportFactory }] = await Promise.all([
        import('@ledgerhq/device-management-kit'),
        import('@ledgerhq/device-transport-kit-web-hid'),
      ]);

      return new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build();
    })().catch((error: unknown) => {
      deviceManagementKit = undefined;
      throw error;
    });

    return deviceManagementKit;
  }

  // A device the user already allowed is reused, so the browser asks for a device only once.
  // With several allowed devices and no preferred one, the browser asks the user to choose.
  private static async findDevice(
    dmk: DeviceManagementKit,
    generation: number,
    preferredDeviceId?: string,
  ): Promise<DiscoveredDevice> {
    const { firstValueFrom, skip, take, timeout, TimeoutError } = await import('rxjs');

    let devices: DiscoveredDevice[] = [];
    try {
      // The kit emits the devices it knows at once, then the devices the browser lists.
      // Only the second list is current.
      devices = await firstValueFrom(
        dmk
          .listenToAvailableDevices({})
          .pipe(skip(1), take(1), timeout({ first: KNOWN_DEVICE_TIMEOUT_MS })),
        { defaultValue: [] },
      );
    } catch (error: unknown) {
      if (!(error instanceof TimeoutError)) throw error;
    }

    const preferred = devices.find(({ id }) => id === preferredDeviceId);
    if (nonNullish(preferred)) return preferred;
    if (devices.length === 1) return devices[0];

    // A session closed during the lookup must not open the browser device picker.
    LedgerIdentity.assertSessionOpen(generation);

    return firstValueFrom(dmk.startDiscovering({}));
  }

  // Waits for the running action, then holds the lock until `unlock` runs. The generation
  // is the one the lock was granted under; the caller checks it after each later await.
  private static async lockActions(): Promise<{ unlock: () => void; generation: number }> {
    for (;;) {
      const generation = lockGeneration;
      const previous = actionLock;
      let unlock: () => void = () => undefined;
      actionLock = new Promise<void>((resolve) => {
        unlock = resolve;
      });
      await previous;

      if (generation === lockGeneration) return { unlock, generation };

      // The session closed while this action waited: give the stale turn up and queue again.
      unlock();
    }
  }

  // Reuses the shared session when it is alive and on the chosen device, else opens one.
  private static async openSession(
    dmk: DeviceManagementKit,
    generation: number,
    preferredDeviceId?: string,
  ): Promise<Session> {
    // A session closed during the module loads must not open the browser device picker.
    LedgerIdentity.assertSessionOpen(generation);

    // The device choice comes first, so a warm session on another device is not reused by
    // mistake when several devices are allowed. The idle timer of the shared session keeps
    // running until the choice succeeds, so a cancelled chooser leaves no open session behind.
    const device = await this.findDevice(dmk, generation, preferredDeviceId);
    LedgerIdentity.assertSessionOpen(generation);

    const current = session;
    if (nonNullish(current)) {
      clearTimeout(current.idleTimer);
      // The kit ends the session when the device disconnects.
      const alive = dmk.listConnectedDevices().some(({ sessionId }) => sessionId === current.id);

      if (alive && device.id === current.deviceId) return current;

      session = undefined;
      if (alive) await LedgerIdentity.disconnectSession(dmk, current.id);
      LedgerIdentity.assertSessionOpen(generation);
    }

    const id = await dmk.connect({
      device,
      // The refresher polls the device between the APDUs of a multi-chunk signature.
      sessionRefresherOptions: { isRefresherDisabled: true },
    });

    // The session closed during the connection: the new session is not published.
    if (generation !== lockGeneration) {
      await LedgerIdentity.disconnectSession(dmk, id);
      throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
    }
    session = { id, deviceId: device.id };

    return session;
  }

  // An action set up before the session closed must not touch a session opened after it.
  private static assertSessionOpen(generation: number): void {
    if (generation !== lockGeneration) {
      throw new LedgerDeviceError(LedgerErrorCode.SessionClosed);
    }
  }

  // The session stays open for a while, so the next action does not reopen a closing device.
  private static releaseSession(dmk: DeviceManagementKit, released: Session): void {
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

  /**
   * Closes the shared device session now, for example on logout.
   * An action that is still running loses its turn: the next action starts at once. Actions
   * that were queued behind it wait their turn again on the new queue.
   */
  public static async closeSession(): Promise<void> {
    lockGeneration += 1;
    actionLock = Promise.resolve();

    const current = session;
    if (isNullish(current) || isNullish(deviceManagementKit)) return;

    clearTimeout(current.idleTimer);
    session = undefined;
    await LedgerIdentity.disconnectSession(await deviceManagementKit, current.id);
  }

  // Public so tests can stub the device.
  public static async connect(preferredDeviceId?: string): Promise<Connection> {
    const { unlock, generation } = await LedgerIdentity.lockActions();

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

      const opened = await this.openSession(dmk, generation, preferredDeviceId);

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
          release: () => {
            LedgerIdentity.releaseSession(dmk, opened);
            unlock();
          },
          transportError: () => lastDmkError,
        };
      } catch (error: unknown) {
        LedgerIdentity.releaseSession(dmk, opened);
        throw error;
      }
    } catch (error: unknown) {
      unlock();
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
