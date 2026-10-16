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
import type TransportWebHID from '@ledgerhq/hw-transport-webhid';
import type LedgerApp from '@zondax/ledger-icp';
import type { ResponseAddress, ResponseVersion } from '@zondax/ledger-icp';

import { LEDGER_DEFAULT_DERIVE_PATH, LEDGER_MIN_APP_VERSION } from './constants';
import { LedgerDeviceError, LedgerErrorCode, type LedgerTransportError } from './errors';
import {
  createReadStatePaths,
  decodePublicKey,
  decodeSignature,
  decodeUpdateSignatures,
  getRequestId,
  type RequestSignatures,
} from './ledgerUtils';
import type { Secp256k1PublicKey } from './secp256k1';
import { ensureBuffer } from './webhid';

type Transport = Awaited<ReturnType<typeof TransportWebHID.create>>;

type ReadStateData = {
  signature: Signature;
  body: ReadStateRequest;
};

/**
 * An identity whose private key lives on a Ledger device.
 *
 * Every device interaction opens its own transport and closes it after the call, so no
 * other application is locked out between two actions. agent-js calls `transformRequest`
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

  protected constructor(
    private readonly derivePath: string,
    private readonly publicKey: Secp256k1PublicKey,
  ) {
    super();
  }

  public static async create(
    derivePath: string = LEDGER_DEFAULT_DERIVE_PATH,
  ): Promise<LedgerIdentity> {
    const { app, transport } = await this.connect();

    try {
      const publicKey = await this.fetchPublicKeyFromDevice({ app, derivePath });

      return new this(derivePath, publicKey);
    } finally {
      await transport.close();
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
    return this.executeWithApp((app) => app.showAddressAndPubKey(this.derivePath));
  }

  /**
   * The version of the Internet Computer app on the device.
   * `targetId` starts with the device model: 3300 Nano X, 3310 Nano S+, 3320 Stax, 3330 Flex.
   */
  public async getVersion(): Promise<ResponseVersion> {
    return this.executeWithApp((app) => app.getVersion());
  }

  public override async sign(blob: Uint8Array): Promise<Signature> {
    const txType = this.consumeStakeFlag();
    await this.raiseIfVersionIsDeprecated();

    return this.executeWithApp(async (app) => {
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

  private static async getTransport(): Promise<Transport> {
    const { default: TransportWebHID } = await import('@ledgerhq/hw-transport-webhid');

    return TransportWebHID.create();
  }

  // Public so tests can stub the device.
  public static async connect(): Promise<{ app: LedgerApp; transport: Transport }> {
    try {
      await ensureBuffer();
      const transport = await this.getTransport();
      const { default: InternetComputerApp } = await import('@zondax/ledger-icp');

      return { app: new InternetComputerApp(transport), transport };
    } catch (error: unknown) {
      throw LedgerIdentity.mapTransportError(error);
    }
  }

  private static mapTransportError(error: unknown): LedgerDeviceError {
    const { name, message = '', id } = (error ?? {}) as LedgerTransportError;

    if (name === 'TransportOpenUserCancelled') {
      return message.includes('not supported')
        ? new LedgerDeviceError(LedgerErrorCode.BrowserNotSupported)
        : new LedgerDeviceError(LedgerErrorCode.AccessDenied);
    }

    if (id === 'NoDeviceFound') {
      return new LedgerDeviceError(LedgerErrorCode.NoDevice);
    }

    if (message.includes('cannot open device with path')) {
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
    const { app, transport } = await LedgerIdentity.connect();

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

      return await callback(app);
    } finally {
      await transport.close();
    }
  }

  private async raiseIfVersionIsDeprecated(): Promise<void> {
    const { major, minor, patch } = await this.getVersion();
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
    await this.raiseIfVersionIsDeprecated();

    return this.executeWithApp(async (app) => {
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
