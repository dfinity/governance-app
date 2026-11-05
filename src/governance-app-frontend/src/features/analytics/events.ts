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
  StakingRefreshVotingPowerAll = 'staking_refresh_voting_power_all',
  StakingRefreshVotingPowerAllError = 'staking_refresh_voting_power_all_error',
  StakingOpenApyOptimization = 'staking_open_apy_optimization',
  StakingOpenStakingRatio = 'staking_open_staking_ratio',

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
  AccountOpenDeposit = 'account_open_deposit',
  AccountOpenSend = 'account_open_send',
  AccountQrScanOpen = 'account_qr_scan_open',
  AccountQrScanSuccess = 'account_qr_scan_success',
  AccountQrScanError = 'account_qr_scan_error',

  // Ledger device
  LedgerDeviceConnect = 'ledger_device_connect',
  LedgerDeviceConnectError = 'ledger_device_connect_error',
  LedgerDeviceRegister = 'ledger_device_register',
  LedgerDeviceRegisterError = 'ledger_device_register_error',
  LedgerDeviceVerify = 'ledger_device_verify',
  LedgerDeviceVerifyError = 'ledger_device_verify_error',
  LedgerDeviceAction = 'ledger_device_action',
  LedgerDeviceActionError = 'ledger_device_action_error',
  LedgerDeviceStake = 'ledger_device_stake',
  LedgerDeviceStakeError = 'ledger_device_stake_error',
  LedgerDeviceTopUp = 'ledger_device_top_up',
  LedgerDeviceTopUpError = 'ledger_device_top_up_error',
  LedgerDeviceSend = 'ledger_device_send',
  LedgerDeviceSendError = 'ledger_device_send_error',

  // Session
  LoginSuccess = 'login_success',
  LoginError = 'login_error',
  SessionLogout = 'session_logout',
  SessionExpired = 'session_expired',

  // Navigation and tools
  CommandPaletteOpen = 'command_palette_open',
  CommandPaletteSelect = 'command_palette_select',
  ShortcutUsed = 'shortcut_used',
  NotFound = 'not_found',

  // Preferences
  ForecastPeriodChange = 'forecast_period_change',
}
// @TODO:
//  - click on the navigation items
