export interface KongSwapTicker {
  ticker_id: string; // E.g. "ryjl3-tyaaa-aaaaa-aaaba-cai_cngnf-vqaaa-aaaar-qag4q-cai"
  base_currency: string; // E.g. "ryjl3-tyaaa-aaaaa-aaaba-cai"
  target_currency: string; // E.g. "cngnf-vqaaa-aaaar-qag4q-cai"
  pool_id: string; // E.g. "1"
  last_price: number; // E.g. 3.218410297586249
  base_volume: number; // E.g. 7642.074968209995
  target_volume: number; // E.g. 32532.599679000006
  liquidity_in_usd: number; // E.g. 663097.25423021
}
