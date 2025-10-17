type CanisterId = string;

export type TokenPrices = Map<
  CanisterId,
  {
    name: string;
    icp: number;
    usd: number;
  }
>;
