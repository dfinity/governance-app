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
  StakingConfirmationError = 'staking_confirmation_error',
}
// @TODO:
//  - successful login
//  - click on the navigation items
//  - click on dashboard buttons (deposit / withdraw / staking - apy warning icons)
//  - view proposal link
//  - manual voting
//  - change of followee
