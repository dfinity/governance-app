import { ICP_MIN_STAKE_AMOUNT, ICP_TRANSACTION_FEE } from '@constants/extra';

export const hasEnoughBalanceToStake = (balance: number) => {
  return balance >= ICP_MIN_STAKE_AMOUNT + ICP_TRANSACTION_FEE;
};
