/**
 * The bridge contract, without the DOM.
 *
 * `createPostMessageBridge` is deliberately **not** re-exported here. It touches
 * `window`, and this subpath is what the extension host imports — a Node process
 * with no DOM. Splitting the transport from the contract is what lets both sides of
 * the boundary import the same vocabulary without one of them pretending to be a
 * browser. The transport is exported from the package root, which only the webview
 * bundle loads.
 */
export type {
  AnimationPreview,
  GeneratedSnippet,
  HostBridge,
  HostCapabilities,
  HostInbound,
  HostOutbound,
  UiPreferences,
  RootCleanupPlan,
  RootCleanupProposal,
} from './types.js';
export {
  BROWSER_ANIMATED_FORMATS,
  LOTTIE_FORMATS,
  CAPABILITY_BY_OUTBOUND_TYPE,
  DEFAULT_PREFERENCES,
  buildAnimationPreview,
  INBOUND_TYPES,
  NO_CAPABILITIES,
  OUTBOUND_TYPES,
  isPermitted,
} from './types.js';
export type { ValidationResult } from './validate.js';
export { validateInbound, validateOutbound } from './validate.js';
