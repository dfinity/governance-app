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
  StakingRefreshVotingPower = 'staking_refresh_voting_power',
  StakingRefreshVotingPowerError = 'staking_refresh_voting_power_error',

  // Following flow
  FollowingSimpleConfirmation = 'following_simple_confirmation',
  FollowingSimpleConfirmationError = 'following_simple_confirmation_error',
  FollowingPickerSelectNeurons = 'following_picker_select_neurons',
  FollowingPickerSelectTopics = 'following_picker_select_topics',
  FollowingPickerApply = 'following_picker_apply',
  FollowingPickerApplyError = 'following_picker_apply_error',
  FollowingRemoveFollowee = 'following_remove_followee',
  FollowingClearAll = 'following_clear_all',

  // Voting / proposals funnel
  VotingShowProposals = 'voting_show_proposals',
  VotingOpenProposalDetail = 'voting_open_proposal_detail',
  VotingCastVote = 'voting_cast_vote',
  VotingCastVoteError = 'voting_cast_vote_error',

  // Neuron actions
  NeuronIncreaseStake = 'neuron_increase_stake',
  NeuronIncreaseStakeError = 'neuron_increase_stake_error',
  NeuronIncreaseDelay = 'neuron_increase_delay',
  NeuronIncreaseDelayError = 'neuron_increase_delay_error',
  NeuronToggleDissolving = 'neuron_toggle_dissolving',
  NeuronToggleDissolvingError = 'neuron_toggle_dissolving_error',
  NeuronSetMaturityMode = 'neuron_set_maturity_mode',
  NeuronSetMaturityModeError = 'neuron_set_maturity_mode_error',
  NeuronStakeMaturity = 'neuron_stake_maturity',
  NeuronStakeMaturityError = 'neuron_stake_maturity_error',
  NeuronDisburseMaturity = 'neuron_disburse_maturity',
  NeuronDisburseMaturityError = 'neuron_disburse_maturity_error',
  NeuronDisburse = 'neuron_disburse',
  NeuronDisburseError = 'neuron_disburse_error',

  // Accounts
  AccountSendIcp = 'account_send_icp',
  AccountSendIcpError = 'account_send_icp_error',
  AccountCreateSubaccount = 'account_create_subaccount',
  AccountCreateSubaccountError = 'account_create_subaccount_error',
  AccountRenameSubaccount = 'account_rename_subaccount',
  AccountRenameSubaccountError = 'account_rename_subaccount_error',
  AddressBookSave = 'address_book_save',
  AddressBookSaveError = 'address_book_save_error',
}
// @TODO:
//  - successful login
//  - click on the navigation items
//  - click on dashboard buttons (deposit / withdraw / staking - apy warning icons)
