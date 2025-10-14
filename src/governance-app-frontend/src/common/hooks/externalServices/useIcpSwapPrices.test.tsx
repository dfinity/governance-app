import { describe, expect, it } from 'vitest';

import { CANISTER_ID_ICP_LEDGER } from '@constants/canisterIds';
import { IcpSwapTicker } from '@typings/icpSwap';

import { parseIcpSwapTickers } from './useIcpSwapPrices';

describe('parseIcpSwapTickers', () => {
  it('Parses IcpSwap tickers correctly.', () => {
    const data = [...testData];

    // Throw in case cdkUSDC ticker is missing.
    expect(() => parseIcpSwapTickers(data)).toThrow();

    // Pairs are grouped by base_id, and the one with the highest target_volume_24H is chosen.
    data.push(ckUSDCTicker);
    let res = parseIcpSwapTickers(data);
    expect(res.size).toBe(3); // ALICE, ckUSDC, ICP
    expect(res.get('oj6if-riaaa-aaaaq-aaeha-cai')?.name).toEqual('ALICE_ICP 3'); // Highest volume ticker for ALICE

    // Non-ICP based tickers are ignored.
    data.push(otherTickerNonIcpBased);
    res = parseIcpSwapTickers(data);
    expect(res.size).toBe(3); // Still ALICE, ckUSDC, ICP

    // The ICP ticker is always added.
    expect(res.get(CANISTER_ID_ICP_LEDGER!)).toEqual({
      name: 'ICP',
      icp: 1,
      usd: 3.537176,
    });

    // Throw in case the ICP price is not a finite non-zero number.
    const invalidCkUSDC = { ...ckUSDCTicker, last_price: '0' };
    expect(() => parseIcpSwapTickers([...testData, invalidCkUSDC])).toThrow();
  });
});

const testData: IcpSwapTicker[] = [
  {
    ticker_id: 'fj6py-4yaaa-aaaag-qnfla-cai',
    ticker_name: 'ALICE_ICP 1',
    base_id: 'oj6if-riaaa-aaaaq-aaeha-cai',
    base_currency: 'ALICE',
    target_id: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    target_currency: 'ICP',
    last_price: '17.841726',
    base_volume: '0.000000',
    target_volume: '0.000000',
    base_volume_24H: '117330.141557',
    target_volume_24H: '66.301674',
    total_volume_usd: '15061079.563157',
    volume_usd_24H: '2296.330839',
    fee_usd: '0.000000',
    liquidity_in_usd: '22604.152255',
  },
  {
    ticker_id: 'fj6py-4yaaa-aaaag-qnfla-cai',
    ticker_name: 'ALICE_ICP 2',
    base_id: 'oj6if-riaaa-aaaaq-aaeha-cai',
    base_currency: 'ALICE',
    target_id: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    target_currency: 'ICP',
    last_price: '1.841726',
    base_volume: '0.000000',
    target_volume: '0.000000',
    base_volume_24H: '117330.141557',
    target_volume_24H: '6.301674',
    total_volume_usd: '15061079.563157',
    volume_usd_24H: '2296.330839',
    fee_usd: '0.000000',
    liquidity_in_usd: '22604.152255',
  },
  {
    ticker_id: 'fj6py-4yaaa-aaaag-qnfla-cai',
    ticker_name: 'ALICE_ICP 3',
    base_id: 'oj6if-riaaa-aaaaq-aaeha-cai',
    base_currency: 'ALICE',
    target_id: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    target_currency: 'ICP',
    last_price: '173.841726',
    base_volume: '0.000000',
    target_volume: '0.000000',
    base_volume_24H: '117330.141557',
    target_volume_24H: '663.301674',
    total_volume_usd: '15061079.563157',
    volume_usd_24H: '2296.330839',
    fee_usd: '0.000000',
    liquidity_in_usd: '22604.152255',
  },
];

const ckUSDCTicker = {
  ticker_id: 'mohjv-bqaaa-aaaag-qjyia-cai',
  ticker_name: 'ckUSDC_ICP',
  base_id: 'xevnm-gaaaa-aaaar-qafnq-cai',
  base_currency: 'ckUSDC',
  target_id: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  target_currency: 'ICP',
  last_price: '3.537176',
  base_volume: '0.000000',
  target_volume: '0.000000',
  base_volume_24H: '116354.224577',
  target_volume_24H: '33137.745699',
  total_volume_usd: '111525203.128593',
  volume_usd_24H: '116478.096444',
  fee_usd: '0.000000',
  liquidity_in_usd: '395531.453171',
};

const otherTickerNonIcpBased = {
  ticker_id: 'bs7dn-wiaaa-aaaag-qncpq-cai',
  ticker_name: 'CHAT_ICS',
  base_id: '2ouva-viaaa-aaaaq-aaamq-cai',
  base_currency: 'CHAT',
  target_id: 'ca6gz-lqaaa-aaaaq-aacwa-cai',
  target_currency: 'ICS',
  last_price: '0.044976',
  base_volume: '0.000000',
  target_volume: '0.000000',
  base_volume_24H: '85.153929',
  target_volume_24H: '1918.520475',
  total_volume_usd: '18180.605530',
  volume_usd_24H: '7.449243',
  fee_usd: '0.000000',
  liquidity_in_usd: '490.169649',
};
