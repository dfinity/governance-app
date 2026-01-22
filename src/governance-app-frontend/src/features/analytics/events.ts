/**
 * Analytics event names for Plausible tracking.
 * Each event name should be a descriptive string in snake_case format.
 *
 * @example
 * // Usage in components:
 * analytics.event(EventName.ButtonClick, { button_id: 'submit' });
 */
export enum AnalyticsEvent {
  // Staking flow
  StakingOpenWizard = 'staking_open_wizard',
  StakingSetStakeAmount = 'staking_set_stake_amount',
  StakingSetDissolveDelay = 'staking_set_dissolve_delay',
  StakingSetConfiguration = 'staking_set_configuration',
  StakingConfirmation = 'staking_confirmation',
}
