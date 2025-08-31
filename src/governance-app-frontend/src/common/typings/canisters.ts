export type CanisterStatus<T> =
  | {
      ready: false;
      authenticated: boolean;
      canister: undefined;
    }
  | {
      ready: true;
      authenticated: boolean;
      canister: T;
    };
