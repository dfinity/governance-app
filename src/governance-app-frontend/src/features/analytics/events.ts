/**
 * Analytics event names for Plausible tracking.
 * Each event name should be a descriptive string in snake_case format.
 *
 * @example
 * // Usage in components:
 * analytics.event(EventName.ButtonClick, { button_id: 'submit' });
 */
export enum EventName {
  // Page events
  PageView = 'page_view',

  // User interaction events
  ButtonClick = 'button_click',
  LinkClick = 'link_click',
  FormSubmit = 'form_submit',

  // Navigation events
  NavigationClick = 'navigation_click',
  TabChange = 'tab_change',

  // Feature-specific events (add your custom events below)
  // Example:
  // ProposalCreated = 'proposal_created',
  // VoteCast = 'vote_cast',
}
