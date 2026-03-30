type CanisterId = string;

export type TokenPrices = Map<
  CanisterId,
  {
    // Useful for debugging purposes, marked as private because only IcpSwap provides a name for the ticker (so it is not always available).
    _name: string;
    icp: number;
    usd: number;
    // Previous day's USD price. Only available when the backend canister is the exchange rate source.
    previousUsd?: number;
  }
>;
