import type { HostBridge } from './bridge/types.js';
import './components/animoria-workspace.js';
import type { AnimoriaWorkspace } from './components/animoria-workspace.js';

/**
 * `@animoria/ui` — Animoria's shared product UI.
 *
 * ## The contract, in one sentence
 * Given a `WorkspaceAnalysis` and a `HostBridge`, this package renders Animoria and
 * emits intent. It decides nothing about the workspace and calls no platform API.
 *
 * ## What a host does
 * ```ts
 * const bridge = createPostMessageBridge({ post: (m) => vscode.postMessage(m) });
 * mount(document.getElementById('root')!, bridge);
 * ```
 * Then send `capabilities` followed by `analysis`. The UI sends `ready` when it can
 * receive; a host that sends before `ready` is racing its own mount.
 */

export { AnimoriaWorkspace } from './components/animoria-workspace.js';
export { AnimoriaAssetCard } from './components/animoria-asset-card.js';
export { AnimoriaAssetInspector } from './components/animoria-asset-inspector.js';
export { AnimoriaSnippetPanel } from './components/animoria-snippet-panel.js';
export { AnimoriaRootSelector } from './components/animoria-root-selector.js';
export { AnimoriaTrashPanel } from './components/animoria-trash-panel.js';
export { AnimoriaCleanupPreview } from './components/animoria-cleanup-preview.js';
export { AnimoriaConfidenceBadge } from './components/animoria-confidence-badge.js';
export { AnimoriaCoverageSummary } from './components/animoria-coverage-summary.js';
export { AnimoriaDuplicateGroupView } from './components/animoria-duplicate-group.js';
export { AnimoriaEvidencePanel } from './components/animoria-evidence-panel.js';
export { AnimoriaFinding } from './components/animoria-finding.js';
export { AnimoriaHealthSummary } from './components/animoria-health-summary.js';
export { AnimoriaStatePanel } from './components/animoria-state-panel.js';

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
} from './bridge/types.js';
export {
  BROWSER_ANIMATED_FORMATS,
  LOTTIE_FORMATS,
  CAPABILITY_BY_OUTBOUND_TYPE,
  DEFAULT_PREFERENCES,
  INBOUND_TYPES,
  NO_CAPABILITIES,
  OUTBOUND_TYPES,
  buildAnimationPreview,
  isPermitted,
} from './bridge/types.js';
export { createPostMessageBridge } from './bridge/postmessage-bridge.js';
export { validateInbound, validateOutbound } from './bridge/validate.js';

export type { AnalysisViewModel, FindingSection } from './view-model/analysis-view-model.js';
export {
  buildAnalysisViewModel,
  cleanupReasonLabel,
  confidenceLabel,
  formatBytes,
} from './view-model/analysis-view-model.js';

/**
 * Mounts the shared UI into a host-provided element.
 *
 * Returns the element so a host can dispose it on panel close — a host that drops
 * the reference leaks a `message` listener per mount, which is the JetBrains
 * panel-reopen leak in a new place.
 */
export function mount(
  root: HTMLElement,
  bridge: HostBridge,
  /**
   * Which single product surface to render.
   *
   * Hosts mount one surface per panel — an inspector beside the editor, duplicates in
   * their own view — because a capability is not a tab. `all` is the combined view,
   * used by the sandbox, where seeing every screen at once is the point.
   */
  surface: AnimoriaWorkspace['surface'] = 'all'
): AnimoriaWorkspace {
  const workspace = document.createElement('animoria-workspace');
  workspace.bridge = bridge;
  workspace.surface = surface;
  root.replaceChildren(workspace);
  return workspace;
}
