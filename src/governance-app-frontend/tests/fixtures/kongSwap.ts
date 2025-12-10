import { CANISTER_ID_CKUSD_LEDGER, CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { KongSwapTicker } from '@typings/kongSwap';

export const fixture_KongSwapTickers_Alice: KongSwapTicker = {
  ticker_id: `oj6if-riaaa-aaaaq-aaeha-cai_${CANISTER_ID_ICP_LEDGER}`,
  base_currency: 'oj6if-riaaa-aaaaq-aaeha-cai',
  target_currency: CANISTER_ID_ICP_LEDGER!,
  pool_id: '139',
  last_price: 0.005388371583799956,
  base_volume: 0,
  target_volume: 0,
  liquidity_in_usd: 64.6746111132775,
};

export const fixture_KongSwapTickers_ckUSDC: KongSwapTicker = {
  ticker_id: `${CANISTER_ID_CKUSD_LEDGER}_${CANISTER_ID_ICP_LEDGER}`,
  base_currency: CANISTER_ID_CKUSD_LEDGER!,
  target_currency: CANISTER_ID_ICP_LEDGER!,
  pool_id: '127',
  last_price: 0.2996200817363583,
  base_volume: 0.836893,
  target_volume: 0,
  liquidity_in_usd: 70.5899936936853,
};

export const fixture_KongSwapTickers_nonIcpBased: KongSwapTicker = {
  ticker_id: 'o4zzi-qaaaa-aaaaq-aaeeq-cai_cngnf-vqaaa-aaaar-qag4q-cai',
  base_currency: 'o4zzi-qaaaa-aaaaq-aaeeq-cai',
  target_currency: 'cngnf-vqaaa-aaaar-qag4q-cai',
  pool_id: '137',
  last_price: 0,
  base_volume: 0,
  target_volume: 0,
  liquidity_in_usd: 0,
};
