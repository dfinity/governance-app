import {
  type GovernanceCachedMetrics,
  type NetworkEconomics,
  type NeuronInfo,
  NeuronState,
} from '@icp-sdk/canisters/nns';
import { Principal } from '@icp-sdk/core/principal';

import { SECONDS_IN_DAY, SECONDS_IN_EIGHT_YEARS } from '@constants/extra';
import { getNeuronId } from '@utils/neuron';

type TestStakingRewardCalcParams = {
  isAuthenticated: boolean;
  totalVotingPower: bigint;
  balance: number;
  neurons: Array<
    Pick<NeuronInfo, 'neuronId' | 'state' | 'dissolveDelaySeconds'> & {
      fullNeuron: Pick<
        NonNullable<NeuronInfo['fullNeuron']>,
        | 'maturityE8sEquivalent'
        | 'stakedMaturityE8sEquivalent'
        | 'cachedNeuronStake'
        | 'neuronFees'
        | 'agingSinceTimestampSeconds'
        | 'dissolveState'
        | 'autoStakeMaturity'
      >;
    }
  >;
  economics: {
    parameters: Pick<NetworkEconomics, 'neuronMinimumStake'> & {
      votingPowerEconomics: Pick<
        NonNullable<NetworkEconomics['votingPowerEconomics']>,
        'neuronMinimumDissolveDelayToVoteSeconds'
      >;
    };
  };
  governanceMetrics: {
    metrics: Pick<GovernanceCachedMetrics, 'totalSupplyIcp'>;
  };

  nnsTotalVotingPower: bigint;
};

const referenceDate = new Date('2025-07-04T00:00:00Z'); // 4 Jul 2025
const referenceDateSeconds = referenceDate.getTime() / 1000;

describe('neuron-utils', () => {
  let params: TestStakingRewardCalcParams;

  beforeEach(() => {
    // Reset params before each test to ensure a clean state
    params = getInitialMockedParams();
  });

  it('Works with an empty account (no neurons, no tokens, no SNSs)', () => {
    params.nnsNeurons.neurons = [];
    params.tokens = [];
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).apy.get(OWN_CANISTER_ID_TEXT).cur, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).apy.get(OWN_CANISTER_ID_TEXT).max, 2)).toBe(0);

    params.snsProjects.data.push(getTestSns());
    expect(roundToDecimals(getRewardData(params).apy.get(TEST_SNS_IDS[0]).cur, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).apy.get(TEST_SNS_IDS[0]).max, 2)).toBe(0);

    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0);
  });

  it('Errors when some conditions are not met', () => {
    // FX provider fails
    params.fxRates = 'error';
    expect(() => getRewardData(params)).toThrow();
  });

  //////////////////
  /// REWARD BALANCE
  //////////////////
  it('Calculates the Reward balance', () => {
    // Initial state with a single NNS neuron, no matutiry, no fees, no reward
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(0);

    // Increase the stake, it should not change the reward balance
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(500 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(0);

    // Add staked maturity, it should affect the reward balance
    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      50 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(50);

    // Increase the staked maturity
    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = BigInt(500 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      500 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(500);

    // Add un-staked maturity, it should also affect the reward balance
    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = BigInt(900 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1400 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1400);

    // Add neuron fees, it should not affect the reward balance (it is subtracted from the stake, not the maturity)
    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = BigInt(100 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1400 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1400);

    // Add a second neuron, it should add up the reward balance
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons[1].fullNeuron.stakedMaturityE8sEquivalent = BigInt(100 * E8S_RATE);
    params.nnsNeurons.neurons[1].fullNeuron.maturityE8sEquivalent = BigInt(300 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);

    // Dissolve delay should not affect the reward balance
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_7_DAYS),
    };
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);

    // Dissolve state should not affect the reward balance
    params.nnsNeurons.neurons[0].state = NeuronState.Dissolving;
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds + SECONDS_IN_7_DAYS),
    };

    // Change the FX rate, it should affect the reward balance
    params.fxRates[LEDGER_CANISTER_ID.toText()] = 12.34;
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);

    // Add an SNS project, without a neuron, it should not affect the reward balance
    params.snsProjects.data.push(getTestSns());
    params.tokens.push({
      balanceInUsd: 0,
      ledgerCanisterId: Principal.fromText(TEST_SNS_IDS[0]),
    });
    params.fxRates[TEST_SNS_IDS[0]] = 100;
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()],
    );
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);

    // Add 2 SNS neurons with maturities and stake, it should add up the reward balance
    params.snsNeurons[TEST_SNS_IDS[0]] = {
      neurons: [getTestNeuronSns(), getTestNeuronSns()],
    };
    params.snsNeurons[TEST_SNS_IDS[0]].neurons.forEach((n) => {
      n.cached_neuron_stake_e8s = BigInt(100 * E8S_RATE);
      n.aging_since_timestamp_seconds = BigInt(referenceDateSeconds);
      n.auto_stake_maturity = [false];
      n.dissolve_state = [
        {
          DissolveDelaySeconds: BigInt(SECONDS_IN_YEAR),
        },
      ];
      n.maturity_e8s_equivalent = BigInt(50 * E8S_RATE);
      n.staked_maturity_e8s_equivalent = [BigInt(50 * E8S_RATE)];
    });
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()] + 200 * params.fxRates[TEST_SNS_IDS[0]],
    );

    // SNSs should not affect the ICP-only reward balance
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);

    // Add fees to the SNS neurons, it should not affect the reward balance
    params.snsNeurons[TEST_SNS_IDS[0]].neurons.forEach((n) => {
      n.neuron_fees_e8s = BigInt(50 * E8S_RATE);
    });
    expect(roundToDecimals(getRewardData(params).rewardBalanceUSD, 2)).toBe(
      1800 * params.fxRates[LEDGER_CANISTER_ID.toText()] + 200 * params.fxRates[TEST_SNS_IDS[0]],
    );

    // SNSs should not affect the ICP-only reward balance
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityBalance, 2)).toBe(1800);
  });

  ///////////////////
  /// REWARD ESTIMATE
  ///////////////////
  it('Calculates the Reward estimate', () => {
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);
    params.nnsNeurons.neurons[0].state = NeuronState.Locked;
    params.nnsNeurons.neurons[0].fullNeuron.agingSinceTimestampSeconds =
      BigInt(referenceDateSeconds);
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = true;
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(8 * SECONDS_IN_YEAR),
    };
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(1.13);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.13);

    // Double the stake, the reward estimate should double
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(100 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(2.26);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    // In case of no voting power (e.g. data unavailable), the reward estimate should be 0
    const old = params.nnsTotalVotingPower;
    params.nnsTotalVotingPower = BigInt(0);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(0);

    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0);
    params.nnsTotalVotingPower = old;

    // No stake, no reward estimate
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(0);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0);
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);

    // Changes in the fx rate should affect the reward estimate
    params.fxRates[LEDGER_CANISTER_ID.toText()] = 1.23;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(0.15);
    // But not the maturity
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.13);

    params.fxRates[LEDGER_CANISTER_ID.toText()] = 500;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(62.82);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.13);

    params.fxRates[LEDGER_CANISTER_ID.toText()] = 0;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(0);
    // Unless it is zero, since it is used in the calculation
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0);
    params.fxRates[LEDGER_CANISTER_ID.toText()] = 9;

    // Multiple neurons should add up the reward estimates
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons.forEach((n) => {
      n.fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);
      n.state = NeuronState.Locked;
      n.fullNeuron.agingSinceTimestampSeconds = BigInt(referenceDateSeconds);
      n.fullNeuron.autoStakeMaturity = false;
      n.fullNeuron.dissolveState = {
        DissolveDelaySeconds: BigInt(8 * SECONDS_IN_YEAR),
      };
    });
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(4.52);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.5);

    // Remove the last neuron, the reward estimate should be 3/4 of before
    params.nnsNeurons.neurons.pop();
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(3.39);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.38);

    // Token balance should not affect the reward estimate
    params.tokens[0].balanceInUsd = 1000;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(3.39);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.38);

    params.tokens[0].balanceInUsd = 0;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(3.39);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.38);

    // Add a SNS project without a neuron
    params.snsProjects.data.push(getTestSns());
    params.tokens.push({
      balanceInUsd: 0,
      ledgerCanisterId: Principal.fromText(TEST_SNS_IDS[0]),
    });
    params.fxRates[TEST_SNS_IDS[0]] = 100;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(3.39);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.38);

    // Neuron fees should affect the reward estimate
    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(2.26);
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    // Add a couple of SNS neuron with a stake
    params.snsNeurons[TEST_SNS_IDS[0]] = {
      neurons: [getTestNeuronSns(), getTestNeuronSns(), getTestNeuronSns()],
    };
    params.snsNeurons[TEST_SNS_IDS[0]].neurons.forEach((n) => {
      n.cached_neuron_stake_e8s = BigInt(100 * E8S_RATE);
      n.aging_since_timestamp_seconds = BigInt(referenceDateSeconds);
      n.auto_stake_maturity = [false];
      n.dissolve_state = [
        {
          DissolveDelaySeconds: BigInt(SECONDS_IN_YEAR),
        },
      ];
    });
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(37.59);
    // SNSs should not affect the ICP-only reward estimates
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    // Change the stake of one of the SNS neurons
    params.snsNeurons[TEST_SNS_IDS[0]].neurons[0].cached_neuron_stake_e8s = BigInt(200 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(49.36);
    // SNSs should not affect the ICP-only reward estimates
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    params.snsNeurons[TEST_SNS_IDS[0]].neurons[0].cached_neuron_stake_e8s = BigInt(400 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(72.92);
    // SNSs should not affect the ICP-only reward estimates
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    // Change the FX rate of the SNS project
    params.fxRates[TEST_SNS_IDS[0]] = 1.23;
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(3.13);
    // SNSs should not affect the ICP-only reward estimates
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);

    // Add fees to the SNS neuron
    params.snsNeurons[TEST_SNS_IDS[0]].neurons.forEach((n) => {
      n.neuron_fees_e8s = BigInt(500 * E8S_RATE);
    });
    expect(roundToDecimals(getRewardData(params).rewardEstimateWeekUSD, 2)).toBe(2.26);
    // SNSs should not affect the ICP-only reward estimates
    expect(roundToDecimals(getRewardData(params).icpOnly.maturityEstimateWeek, 2)).toBe(0.25);
  });

  /////////////////
  /// STAKING POWER
  /////////////////

  it('Calculates the Staking power (only NNS)', () => {
    // Initial state with a single NNS neuron, equally split between balance and stake
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.5);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    // Account for neuron fees
    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0);
    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = 0n;

    // Account for neuron staked maturitiy
    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.67);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(900);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.67);
    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = 0n;

    // Account for neuron un-staked maturitiy
    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.33);
    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = 0n;

    // Other cases with different balances
    params.tokens[0].balanceInUsd = 900;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.33);

    params.tokens[0].balanceInUsd = 1350;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.25);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.25);

    params.tokens[0].balanceInUsd = 13500;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.03);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.03);

    // Other cases with multiple neurons and different stakes
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.06);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(900);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.06);

    params.nnsNeurons.neurons.push(getTestNeuronNns());
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.09);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(1350);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.09);

    params.nnsNeurons.neurons.push(getTestNeuronNns());
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.12);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(1800);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.12);

    params.nnsNeurons.neurons = [getTestNeuronNns(), getTestNeuronNns()];
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(10 ** 10 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(1.0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450 + 10 ** 10 * 9);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(1);

    // Test with no neurons
    params.nnsNeurons.neurons = [];
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0);

    // Test with a neuron that has no a negligible stake
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(1 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(9);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0);
  });

  it('Calculates the Staking power (with SNSs)', () => {
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.5);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    // Add a SNS project without a neuron
    params.snsProjects.data.push(getTestSns());
    params.tokens.push({
      balanceInUsd: 450,
      ledgerCanisterId: Principal.fromText(TEST_SNS_IDS[0]),
    });
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    // Add an SNS neuron with a stake
    params.snsNeurons[TEST_SNS_IDS[0]] = {
      neurons: [getTestNeuronSns()],
    };
    params.snsNeurons[TEST_SNS_IDS[0]].neurons[0].cached_neuron_stake_e8s = BigInt(45 * E8S_RATE);
    params.fxRates[TEST_SNS_IDS[0]] = 10;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.5);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(900);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    // Modify the FX rate
    params.tokens[1].balanceInUsd = 45 * 1.23;
    params.fxRates[TEST_SNS_IDS[0]] = 1.23;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.5);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450 + 45 * 1.23);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    // Account for neuron fees
    params.tokens[1].balanceInUsd = 450;
    params.snsNeurons[TEST_SNS_IDS[0]].neurons[0].neuron_fees_e8s = BigInt(45 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    params.snsNeurons[TEST_SNS_IDS[0]].neurons[0].neuron_fees_e8s = BigInt(90 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    params.tokens[1].balanceInUsd = 0;
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.5);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(450);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.5);

    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = BigInt(25 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0.33);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(225);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0.33);

    params.nnsNeurons.neurons[0].fullNeuron.neuronFees = BigInt(50 * E8S_RATE);
    expect(roundToDecimals(getRewardData(params).stakingPower, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).stakingPowerUSD, 2)).toBe(0);
    expect(roundToDecimals(getRewardData(params).icpOnly.stakingPower, 2)).toBe(0);
  });

  ///////
  /// APY
  ///////

  const bindCheckApy = (params, confidence) => (id: string, max: boolean, value) =>
    inConfidenceRange(
      roundToDecimals(getRewardData(params).apy.get(id)[max ? 'max' : 'cur'] * 100, 2),
      value,
      confidence,
    );

  const bindCheckNeuronApy =
    (params, confidence) =>
    // Unknown neuron type, to make TS happy since we are picking props manually
    (projectId: string, neuron: unknown, max: boolean, value) =>
      inConfidenceRange(
        roundToDecimals(
          getRewardData(params)
            .apy.get(projectId)
            .neurons.get(getNeuronId(neuron as AgnosticNeuron))[max ? 'max' : 'cur'] * 100,
          2,
        ),
        value,
        confidence,
      );

  it('Calculates the APYs (NNS)', () => {
    // Confidence range for APY calculations in respect to the reference value
    // This is used to check if the calculated APY is within a reasonable range
    // Some small differences can occur due to rounding and different precision levels
    const confidence = 0.01; // 1%, it means that if the reference was 10, a value between 9.9 and 10.1 is also accepted
    const checkApy = bindCheckApy(params, confidence);
    const checkNeuronApy = bindCheckNeuronApy(params, confidence);
    const getNeuron = (index: number) => params.nnsNeurons.neurons[index];

    // Dissolving neuron (6 months dissolve delay)
    params.tokens[0].balanceInUsd = 0;
    params.nnsNeurons.neurons[0].state = NeuronState.Dissolving;
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);
    params.nnsNeurons.neurons[0].fullNeuron.agingSinceTimestampSeconds = BigInt(0);
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = false;
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds) + BigInt(0.5 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0.02)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // The neuron APY should be the same as the NNS total APY since there is only one neuron
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 0.02)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);

    // Locked neuron (6 months dissolve delay)
    params.nnsNeurons.neurons[0].state = NeuronState.Locked;
    params.nnsNeurons.neurons[0].fullNeuron.agingSinceTimestampSeconds =
      BigInt(referenceDateSeconds);
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(0.5 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Different token balance have no effect on APY
    params.tokens[0].balanceInUsd = 10;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.tokens[0].balanceInUsd = 10 * 10 ** 10;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.tokens[0].balanceInUsd = 987654321;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // In case of no voting power (e.g. data unavailable), the APY should be 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let old: any = params.nnsTotalVotingPower;
    params.nnsTotalVotingPower = BigInt(0);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 0)).toBe(true);
    params.nnsTotalVotingPower = old;

    // Different stake should have no effect on APY (more stake, more rewards, same APY ratio)
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(100 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(10000 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(987654321 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 6.85)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);

    // Auto-stake new maturity
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = true;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.1)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 7.1)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);

    // 1 Week of dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds) + BigInt(SECONDS_IN_7_DAYS),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0.0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // 4 Weeks of dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(4 * SECONDS_IN_7_DAYS),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0.0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // 6 Months of dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_HALF_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.1)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // 10 Years of dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(10 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 13.75)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // The FX rate should not affect the APY
    params.fxRates[LEDGER_CANISTER_ID.toText()] = 1.23;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 13.75)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.fxRates[LEDGER_CANISTER_ID.toText()] = 987654.321;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 13.75)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.fxRates[LEDGER_CANISTER_ID.toText()] = 0.000001;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 13.75)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);
    params.fxRates[LEDGER_CANISTER_ID.toText()] = 9;

    // Changes in the minimium dissolve delay are accounted
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(4 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 10.15)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 10.15)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);
    params.nnsEconomics.parameters.votingPowerEconomics = {
      neuronMinimumDissolveDelayToVoteSeconds: BigInt(4 * SECONDS_IN_YEAR + SECONDS_IN_DAY),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    params.nnsEconomics.parameters.votingPowerEconomics = {
      neuronMinimumDissolveDelayToVoteSeconds: BigInt(SECONDS_IN_HALF_YEAR),
    };

    // Changes in the minimium stake are accounted
    params.nnsEconomics.parameters.neuronMinimumStake = BigInt(100 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 0)).toBe(true);
    params.nnsEconomics.parameters.neuronMinimumStake = BigInt(1 * E8S_RATE);

    // Dissolving neuron with 10 years dissolve delay
    params.nnsNeurons.neurons[0].state = NeuronState.Dissolving;
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds) + BigInt(10 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 13.3)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Dissolving neuron with 1 year dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds) + BigInt(1 * SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 3.55)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Dissolving neuron with 1 month dissolve delay
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      WhenDissolvedTimestampSeconds: BigInt(referenceDateSeconds) + BigInt(1 * SECONDS_IN_MONTH),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Staked maturity should not affect the APY (more stake, more rewards, same APY ratio)
    params.nnsNeurons.neurons[0].state = NeuronState.Locked;
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = false;
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);
    params.nnsNeurons.neurons[0].fullNeuron.agingSinceTimestampSeconds =
      BigInt(referenceDateSeconds);
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_YEAR),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = BigInt(50 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = BigInt(
      987654321 * E8S_RATE,
    );
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    params.nnsNeurons.neurons[0].fullNeuron.stakedMaturityE8sEquivalent = 0n;

    // Un-staked maturity should not affect the current APY (the reward is compared to the staked amount)
    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = BigInt(50 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = BigInt(987654321 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    params.nnsNeurons.neurons[0].fullNeuron.maturityE8sEquivalent = 0n;

    // Auto-stake maturity should positively affect the APY (the reward is compared to the INITIAL staked amount)
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = true;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.5)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Handles multiple neurons
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons.push(getTestNeuronNns());
    params.nnsNeurons.neurons.forEach((n) => {
      n.state = NeuronState.Locked;
      n.fullNeuron.neuronFees = BigInt(0);
      n.fullNeuron.autoStakeMaturity = false;
      n.fullNeuron.maturityE8sEquivalent = BigInt(0);
      n.fullNeuron.stakedMaturityE8sEquivalent = BigInt(0);
      n.fullNeuron.cachedNeuronStake = BigInt(50 * E8S_RATE);
      n.fullNeuron.agingSinceTimestampSeconds = BigInt(referenceDateSeconds);
      n.fullNeuron.dissolveState = {
        DissolveDelaySeconds: BigInt(SECONDS_IN_YEAR),
      };
    });

    // Same neurons, same APY
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), true, 13.75)).toBe(true);

    // Let's modify the 1st neuron in order not to generate rewards
    params.nnsNeurons.neurons[0].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_7_DAYS),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, (7.25 / 3) * 2)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Let's modify also the 2nd neuron in order not to generate rewards
    params.nnsNeurons.neurons[1].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_7_DAYS),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25 / 3)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 0)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), false, 0)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), true, 13.75)).toBe(true);

    // All of them are not generating rewards
    params.nnsNeurons.neurons[2].fullNeuron.dissolveState = {
      DissolveDelaySeconds: BigInt(SECONDS_IN_7_DAYS),
    };
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);
    params.nnsNeurons.neurons.forEach((n) => {
      n.fullNeuron.dissolveState = {
        DissolveDelaySeconds: BigInt(SECONDS_IN_YEAR),
      };
    });

    // Let's modify the 1st neuron to have a different stake, should have no effect (same weighted ratio)
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(5000 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Let's modify the 1st neuron to have auto-staking, should have a positive effect, weigthed by the stake (10x)
    params.nnsNeurons.neurons[0].fullNeuron.autoStakeMaturity = true;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.45)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // Let's reduce the stake of the 1st neuron, the positive effect, weigthed by the stake (0.1x), is now negligible
    params.nnsNeurons.neurons[0].fullNeuron.cachedNeuronStake = BigInt(5 * E8S_RATE);
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 7.25)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 13.75)).toBe(true);

    // The changes of a single neuron should not affect the APY of the others
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), false, 7.5)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(0), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(1), true, 13.75)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), false, 7.25)).toBe(true);
    expect(checkNeuronApy(OWN_CANISTER_ID_TEXT, getNeuron(2), true, 13.75)).toBe(true);

    // Let's remove some vital data, the APY should be 0 and we should see an error
    old = params.nnsTotalVotingPower;
    params.nnsTotalVotingPower = 0n;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 0)).toBe(true);
    expect(getRewardData(params).apy.get(OWN_CANISTER_ID_TEXT).error).toBe(
      APY_CALC_ERROR.MISSING_DATA,
    );
    params.nnsTotalVotingPower = old;

    old = params.fxRates[LEDGER_CANISTER_ID.toText()];
    params.fxRates[LEDGER_CANISTER_ID.toText()] = undefined;
    expect(checkApy(OWN_CANISTER_ID_TEXT, false, 0)).toBe(true);
    expect(checkApy(OWN_CANISTER_ID_TEXT, true, 0)).toBe(true);
    expect(getRewardData(params).apy.get(OWN_CANISTER_ID_TEXT).error).toBe(
      APY_CALC_ERROR.MISSING_DATA,
    );
    params.fxRates[LEDGER_CANISTER_ID.toText()] = old;
  });
});

///////////
/// HELPERS
///////////

const getRewardData = (params: TestStakingRewardCalcParams) => {
  const reward = getStakingRewardData(params as unknown as StakingRewardCalcParams, referenceDate);
  if ('error' in reward || reward.loading === true) {
    throw new Error(`Error calculating staking rewards.`);
  }
  return reward;
};

const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const inConfidenceRange = (value: number, reference: number, confidence: number): boolean => {
  const lowerBound = reference * (1 - confidence);
  const upperBound = reference * (1 + confidence);
  return value >= lowerBound && value <= upperBound;
};

/////////
/// MOCKS
/////////

const getInitialMockedParams = (): TestStakingRewardCalcParams => ({
  isAuthenticated: true,
  neurons: {
    neurons: [getApyTestNeuron()],
  },
  economics: {
    parameters: {
      neuronMinimumStake: BigInt(1 * E8S_RATE),
      votingPowerEconomics: {
        neuronMinimumDissolveDelayToVoteSeconds: BigInt(SECONDS_IN_HALF_YEAR),
      },
    },
  },
  governanceMetrics: { metrics: { totalSupplyIcp: 534_809_202n } }, // 24 Jun 2025
  nnsTotalVotingPower: 50_276_005_084_190_970n, // 24 Jun 2025
});

let neuronCounter = 0n;
export const getApyTestNeuron = (
  refDateSeconds: Date = referenceDateSeconds,
): TestStakingRewardCalcParams['neurons'][0] => ({
  neuronId: neuronCounter++,
  state: NeuronState.Locked,
  dissolveDelaySeconds: BigInt(SECONDS_IN_EIGHT_YEARS),
  fullNeuron: {
    maturityE8sEquivalent: BigInt(0),
    stakedMaturityE8sEquivalent: BigInt(0),
    cachedNeuronStake: BigInt(50 * E8S_RATE),
    neuronFees: BigInt(0),
    agingSinceTimestampSeconds: BigInt(refDateSeconds),
    dissolveState: {
      DissolveDelaySeconds: BigInt(SECONDS_IN_EIGHT_YEARS),
    },
    autoStakeMaturity: true,
  },
});
