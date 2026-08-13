import type {
  AnalysisReadiness,
  AnimatedFormat,
  UsageReference,
  CleanupPlan,
  CleanupExecutionResult,
  MultiRootAnalysis,
  ResolutionPlan,
  ReviewableCleanupProposal,
  RestoreResult,
  SessionManifest,
  WorkspaceRoot,
} from '@animoria/core/contracts';

/**
 * One root's cleanup proposal.
 *
 * Per root, never merged: `.animoriarc` is root-scoped, so two roots may offer
 * different assets for different reasons under different policies. A merged list
 * would have to pick one policy to describe.
 */
export interface RootCleanupProposal {
  readonly rootId: string;
  readonly rootName: string;
  readonly proposal: ReviewableCleanupProposal;
}

/**
 * One root's cleanup plan, with the id the host holds it under.
 *
 * A selection spanning roots produces several of these. They are applied
 * independently and stale-checked independently, because
 * `executeCleanupPlan` validates against one root's analysis generation and stages
 * into that root's `.animoria/trash/`.
 */
export interface RootCleanupPlan {
  readonly planId: string;
  readonly rootId: string;
  readonly rootName: string;
  readonly plan: CleanupPlan;
}

/**
 * The one message vocabulary between Animoria's shared UI and any host.
 *
 * ## What this replaces
 * Four incompatible dialects. VS Code's preview panel spoke `{type, payload}` with
 * nine message names and a hand-written validator; its cleanup panel spoke a
 * different eleven; JetBrains spoke a third six *and* pushed state by
 * string-interpolating JSON into `executeJavaScript`, bypassing messages entirely;
 * the sandbox spoke `{command, …}` with eight more. The same product action —
 * "open this asset" — had four names and four payload shapes.
 *
 * ## The two rules that keep this a boundary rather than a pipe
 *
 * **1. The UI never computes a verdict from these payloads.** It renders `analysis`
 * and emits intent. If the UI needs a number, Core sends the number. There is no
 * message here that hands the UI raw material to classify: no rule ids to map to
 * severities, no reference counts to threshold, no scores to derive.
 *
 * **2. The bridge exposes capabilities, never host implementations.** Nothing here
 * names `vscode`, `JBCef`, a `WorkspaceIndexer`, a daemon command, or a filesystem
 * path operation. `host.openFile(path)` is a capability; `host.core.indexer` would
 * be a leak, and a UI that could reach it would stop being portable the same day.
 *
 * ## Why plans travel by id
 * `apply-cleanup-plan` and `apply-resolution-plan` carry a `planId`, not a plan.
 * Preview and execution therefore consume *the same object* the host is holding —
 * the UI cannot edit a plan between seeing it and applying it, and cannot construct
 * one at all. This is the invariant D-20 established for duplicate resolution,
 * extended to cleanup for the same reason: "what you saw is what ran" has to be
 * structural, not a convention two code paths honour.
 */

// ── Capabilities ──────────────────────────────────────────────────────────────

/**
 * What this host can actually do.
 *
 * Declared once on connect, so a component asks "may I?" rather than "which host am
 * I in?". The sandbox sets `canMutate: false` and every destructive control renders
 * **disabled with a reason** rather than vanishing — a harness whose destructive
 * paths are absent cannot review the states a real host shows.
 */
export interface HostCapabilities {
  /** Whether destructive operations may be offered at all. */
  readonly canMutate: boolean;
  /** Whether trash sessions can be listed and restored. */
  readonly canRestore: boolean;
  /** Whether the host can reveal a file in a native file manager. */
  readonly canRevealInFileManager: boolean;
  /** Whether the host can open a source file at a line. */
  readonly canOpenReference: boolean;
  /** Whether the host can produce framework integration snippets. */
  readonly canGenerateSnippet: boolean;
  /** Whether the host has a native clipboard. */
  readonly canCopyToClipboard: boolean;
  /**
   * Why mutation is unavailable, when it is. Rendered verbatim beside the disabled
   * control — a disabled button with no reason is a bug report waiting to happen.
   */
  readonly mutationUnavailableReason: string | null;
}

/** Every capability off. The safe default a host must explicitly widen. */
export const NO_CAPABILITIES: HostCapabilities = {
  canMutate: false,
  canRestore: false,
  canRevealInFileManager: false,
  canOpenReference: false,
  canGenerateSnippet: false,
  canCopyToClipboard: false,
  mutationUnavailableReason: 'This host has not declared any capabilities.',
};

// ── Preferences ───────────────────────────────────────────────────────────────

/**
 * View preferences the host persists on the UI's behalf. Presentation only.
 *
 * Every field drives something a developer can see and change: playback speed and
 * background belong to the inspector's preview, and `assetViewMode` is the flat/tree
 * choice VS Code also exposes as `animoria.toggleViewMode`. They persist per
 * workspace because that is the scope they describe — a preview background chosen for
 * one project is not a claim about the next one.
 *
 * These were briefly deleted during remediation on the grounds that nothing consumed
 * them. That was the wrong test: they had no consumer because the surface that would
 * consume them — the inspector — had itself been deleted. An unimplemented capability
 * and dead code look identical from the call graph and are opposites in intent.
 */
export interface UiPreferences {
  /** Multiplier for animated previews. 1 is real time. */
  readonly playbackSpeed: number;
  /** CSS colour behind a preview, so a white asset is visible on a light theme. */
  readonly previewBackground: string;
  readonly locale: string;
  readonly assetViewMode: 'flat' | 'tree';
}

export const DEFAULT_PREFERENCES: UiPreferences = {
  playbackSpeed: 1,
  previewBackground: 'transparent',
  locale: 'en',
  assetViewMode: 'flat',
};

// ── Snippets ──────────────────────────────────────────────────────────────────

/**
 * One generated integration snippet, as Core produced it.
 *
 * ## Why the code comes back to the UI after all
 * An earlier pass removed the inbound `snippet` message on the grounds that both hosts
 * present snippets natively. They do — and the result was a status-bar message reading
 * "Done, copied", which tells a developer nothing about which framework they picked,
 * what the import line is, or whether it names the right asset. They had to paste into
 * a file to find out.
 *
 * A native picker is the right way to *choose*; it is not a way to *read*. The host
 * still owns the chooser and the clipboard; the panel shows the source.
 */
export interface GeneratedSnippet {
  /** The framework, in Core's own words — "React (lottie-react)". */
  readonly label: string;
  /** The language id, for syntax highlighting: `tsx`, `vue`, `swift`, `kotlin`, `dart`. */
  readonly language: string;
  readonly code: string;
  readonly imports: string | null;
  /** The package a developer must add, when there is one. */
  readonly installHint: string | null;
}

// ── Preview ───────────────────────────────────────────────────────────────────

/**
 * What a host can hand the inspector to show for one asset.
 *
 * ## Why this is a closed union rather than `unknown`
 * The message used to carry `data: unknown`, which meant no host could be wrong and
 * no UI could be right: nothing named what a host was supposed to send, so no host
 * sent anything and the UI never asked. A preview that "exists" as an untyped field
 * is not a capability.
 *
 * ## Why `unsupported` is a payload and not an absence
 * A Lottie or Rive document cannot animate inside a 5 kB Lit bundle — playing it
 * needs a player this package deliberately does not ship. That is a real answer, and
 * the developer is entitled to hear it *as* an answer: a still frame with "playback
 * happens in the editor" beside it, rather than a motionless image that looks broken.
 * `null` would make "we cannot play this" indistinguishable from "we failed".
 */
export type AnimationPreview =
  /**
   * A Lottie document, played by the inspector.
   *
   * The animation's own JSON — for `.lottie` archives, the animation Core extracted
   * from it. Carrying the document rather than a rendered frame is what makes
   * play/pause, scrubbing and speed possible at all: a still cannot be scrubbed, and
   * the migration's first answer to "preview" was a still.
   */
  | {
      readonly kind: 'lottie';
      readonly animation: unknown;
      readonly totalFrames: number;
      readonly frameRate: number;
    }
  /**
   * Bytes the browser animates natively — GIF, APNG, animated SVG.
   *
   * A `data:` URI or a host-served URL. The host must not send a filesystem path: a
   * webview cannot read one, and every host that tried produced a broken image.
   */
  | { readonly kind: 'image'; readonly source: string; readonly animates: boolean }
  /** A rendered still, with the reason playback is not offered here. */
  | { readonly kind: 'still'; readonly source: string; readonly reason: string }
  /** No frame could be produced at all, with the reason. */
  | { readonly kind: 'unsupported'; readonly reason: string };

/**
 * Formats a browser animates from the file's own bytes, with no player.
 *
 * The list is here rather than in each host because it is a property of the format,
 * not of the IDE — and the three hosts answering it separately is how "preview" came
 * to mean something different in each of them.
 */
export const BROWSER_ANIMATED_FORMATS: readonly AnimatedFormat[] = ['gif', 'apng', 'animated-svg'];

/** Formats whose document the inspector's Lottie player can drive. */
export const LOTTIE_FORMATS: readonly AnimatedFormat[] = ['lottie', 'dotlottie'];

/**
 * Classifies one asset's preview from what the host can actually serve.
 *
 * `sourceUrl` is the asset's own bytes; `stillUrl` is Core's rendered frame. Either
 * may be absent, and the four combinations are four different honest answers — which
 * is the whole reason this is one shared function instead of three host opinions.
 */
export function buildAnimationPreview(input: {
  readonly format: AnimatedFormat;
  readonly sourceUrl: string | null;
  readonly stillUrl: string | null;
  /** The Lottie document, when the host could read one. */
  readonly animation?: unknown;
  readonly totalFrames?: number;
  readonly frameRate?: number;
}): AnimationPreview {
  // Playable first. A Lottie or dotLottie whose document the host could read is
  // played, not shown as a frame — the still is the fallback for when it could not.
  if (LOTTIE_FORMATS.includes(input.format) && input.animation) {
    return {
      kind: 'lottie',
      animation: input.animation,
      totalFrames: input.totalFrames ?? 0,
      frameRate: input.frameRate ?? 0,
    };
  }
  if (BROWSER_ANIMATED_FORMATS.includes(input.format) && input.sourceUrl) {
    return { kind: 'image', source: input.sourceUrl, animates: true };
  }
  if (input.stillUrl) {
    return {
      kind: 'still',
      source: input.stillUrl,
      reason:
        input.format === 'rive'
          ? 'Rive playback needs the Rive runtime, which Animoria does not bundle. This is the frame Animoria rendered — open the file to play it.'
          : `Animoria could not read this ${input.format} document, so this is the frame it rendered instead.`,
    };
  }
  return {
    kind: 'unsupported',
    reason: `Animoria could not render a frame for this ${input.format} file. Open it to inspect it.`,
  };
}

// ── UI → host ─────────────────────────────────────────────────────────────────

/**
 * Intent. Every member is something a developer asked for, never a conclusion the
 * UI reached.
 */
export type HostOutbound =
  /** The UI has mounted and can receive state. Hosts send nothing before this. */
  | { readonly type: 'ready' }
  /** Re-run analysis. The only way the UI asks for fresh data. */
  | { readonly type: 'run-analysis' }
  /**
   * Navigation carries the root the target belongs to.
   *
   * The path is absolute and would resolve without it — but a host routing an
   * operation to the right indexer, the right `.animoriarc`, or the right trash
   * directory needs the attribution the analysis already made, rather than
   * re-deriving it by matching the path against its roots. Shared UI must not do
   * workspace-root resolution; it forwards what Core attributed.
   */
  | { readonly type: 'open-asset'; readonly assetPath: string; readonly rootId: string }
  | { readonly type: 'reveal-asset'; readonly assetPath: string; readonly rootId: string }
  | {
      readonly type: 'open-reference';
      readonly file: string;
      readonly line: number;
      /** Empty when the evidence location could not be attributed to a root. */
      readonly rootId: string;
    }
  | { readonly type: 'request-thumbnail'; readonly assetPath: string }
  | { readonly type: 'request-animation-data'; readonly assetPath: string }
  | { readonly type: 'copy-to-clipboard'; readonly text: string; readonly label: string }
  /** Asks the host to offer snippets. The host presents them in its own surface. */
  | { readonly type: 'generate-snippet'; readonly assetPath: string }
  | { readonly type: 'save-preferences'; readonly preferences: UiPreferences }
  /** Asks where an asset is used. Answered by Core's reference index, never guessed. */
  | { readonly type: 'request-usage-references'; readonly assetPath: string }
  // ── Cleanup: propose → plan → apply ──
  | { readonly type: 'request-cleanup-proposal' }
  /**
   * Sets aside a cleanup candidate the developer has judged, so it stops being
   * proposed.
   *
   * A host-scoped preference rather than a Core fact: Core reports that an asset is
   * unreferenced, and that stays true. What changes is whether *this developer, in
   * this workspace* wants to keep being told. `buildCleanupCandidates` has always
   * taken `dismissedPaths`; every host passed an empty set, so the option existed and
   * the capability did not.
   */
  | {
      readonly type: 'dismiss-cleanup-candidate';
      readonly assetPath: string;
      readonly dismissed: boolean;
    }
  | { readonly type: 'request-cleanup-plan'; readonly assetPaths: readonly string[] }
  /** Applies one root's plan. Several plans mean several messages, each confirmed. */
  | {
      readonly type: 'apply-cleanup-plan';
      readonly planId: string;
      /** Explicit opt-in for a `partial` plan. The UI may only set this having shown the refusals. */
      readonly allowPartial: boolean;
    }
  // ── Duplicate resolution: plan → apply (D-20) ──
  | {
      readonly type: 'request-resolution-plan';
      readonly groupId: string;
      readonly keepPath: string;
    }
  | {
      readonly type: 'apply-resolution-plan';
      readonly planId: string;
      readonly allowPartial: boolean;
    }
  // ── Trash ──
  | { readonly type: 'request-trash-sessions' }
  | { readonly type: 'restore-session'; readonly sessionId: string };

// ── host → UI ─────────────────────────────────────────────────────────────────

/** Semantic data. Every member is something Core established. */
export type HostInbound =
  | { readonly type: 'capabilities'; readonly capabilities: HostCapabilities }
  | { readonly type: 'preferences'; readonly preferences: UiPreferences }
  /**
   * Where one asset is used.
   *
   * `complete` is not decoration: an empty list from a scan that has not finished is
   * not the same claim as "used nowhere", and a surface that cannot tell them apart
   * will eventually make the confident version of the wrong statement.
   */
  | {
      readonly type: 'usage-references';
      readonly assetPath: string;
      readonly references: readonly UsageReference[];
      readonly complete: boolean;
    }
  /**
   * Where the developer asked to be, and about what.
   *
   * Contextual routing, and the reason it is a message rather than a mount-time
   * argument: the panel is a singleton, so every entry point after the first reaches
   * an already-open UI. "Resolve duplicates" on a specific finding used to compute
   * the group, discard it, and open the panel on whatever tab it was left on — the
   * developer arrived at a generic surface and had to find their own finding again.
   *
   * This carries only identity, never a conclusion: the tab to show and which asset
   * or group the action was about. The UI selects them; it does not re-derive which
   * they are.
   */
  | {
      readonly type: 'focus';
      readonly tab: 'assets' | 'findings' | 'duplicates' | 'cleanup';
      /** The asset the action started from, if any. Selected and inspected. */
      readonly assetPath: string | null;
      /** The duplicate group the action started from, if any. Opened. */
      readonly groupId: string | null;
      /** The root the target belongs to. Empty when not attributable. */
      readonly rootId: string;
    }
  /**
   * The canonical analysis. The single source every screen renders from.
   *
   * `MultiRootAnalysis` in every host, including single-root ones — a workspace with
   * one root is the one-element case, not a different shape. Two shapes would mean
   * every component branching on which it received, which is how a "multi-root
   * mode" grows into a second presentation model.
   */
  | { readonly type: 'analysis'; readonly analysis: MultiRootAnalysis }
  /**
   * The workspace's roots changed — a folder was added or removed.
   *
   * Distinct from `analysis` because the *set* changing is something a client may
   * need to react to (resetting a root filter that names a root that no longer
   * exists) independently of the analysis it produces.
   */
  | { readonly type: 'roots-changed'; readonly roots: readonly WorkspaceRoot[] }
  | {
      readonly type: 'analysis-progress';
      readonly readiness: AnalysisReadiness;
      readonly message: string;
    }
  | {
      readonly type: 'thumbnail';
      readonly assetPath: string;
      /** A `data:` URI or a host-served URL. Hosts differ here legitimately. */
      readonly source: string | null;
    }
  | {
      readonly type: 'animation-data';
      readonly assetPath: string;
      readonly preview: AnimationPreview | null;
      readonly error: string | null;
    }
  | { readonly type: 'cleanup-proposal'; readonly roots: readonly RootCleanupProposal[] }
  /**
   * The immutable plans, one per root the selection touched.
   *
   * An array rather than one plan: merging them would produce a single operation
   * whose staleness could only be checked against one root's generation, and whose
   * refusals would collapse into one summary that hides which root refused what.
   */
  | { readonly type: 'cleanup-plan'; readonly plans: readonly RootCleanupPlan[] }
  | { readonly type: 'cleanup-result'; readonly result: CleanupExecutionResult }
  | {
      readonly type: 'resolution-plan';
      readonly planId: string;
      readonly rootId: string;
      readonly rootName: string;
      readonly plan: ResolutionPlan;
    }
  | {
      readonly type: 'resolution-result';
      readonly status: 'applied' | 'rejected' | 'failed';
      readonly removedAssetPaths: readonly string[];
      readonly updatedReferenceCount: number;
      readonly recoveredBytes: number;
      readonly trashSessionId: string | null;
      readonly reason: string | null;
    }
  | { readonly type: 'trash-sessions'; readonly sessions: readonly SessionManifest[] }
  | { readonly type: 'restore-result'; readonly result: RestoreResult }
  /**
   * Every snippet Core generated for one asset.
   *
   * A list, never `results[0]`: the choice between React and SwiftUI is the developer's
   * and collapsing it in transit was how the same action offered a picker in one IDE
   * and a single undecodable string in the other.
   */
  | {
      readonly type: 'snippets';
      readonly assetPath: string;
      readonly snippets: readonly GeneratedSnippet[];
    }
  | { readonly type: 'error'; readonly message: string; readonly recoverable: boolean };

// ── The bridge ────────────────────────────────────────────────────────────────

/**
 * What a host implements. Two methods, because a bridge with a method per feature
 * grows a method per feature — and every one of those is a place a host can diverge.
 */
export interface HostBridge {
  /** Sends one intent to the host. */
  send(message: HostOutbound): void;
  /** Subscribes to host state. Returns an unsubscribe function. */
  subscribe(listener: (message: HostInbound) => void): () => void;
}

/** Every outbound message type, for conformance testing. */
export const OUTBOUND_TYPES = [
  'ready',
  'run-analysis',
  'open-asset',
  'reveal-asset',
  'open-reference',
  'request-thumbnail',
  'request-animation-data',
  'copy-to-clipboard',
  'generate-snippet',
  'save-preferences',
  'request-usage-references',
  'dismiss-cleanup-candidate',
  'request-cleanup-proposal',
  'request-cleanup-plan',
  'apply-cleanup-plan',
  'request-resolution-plan',
  'apply-resolution-plan',
  'request-trash-sessions',
  'restore-session',
] as const satisfies readonly HostOutbound['type'][];

/** Every inbound message type, for conformance testing. */
export const INBOUND_TYPES = [
  'capabilities',
  'preferences',
  'usage-references',
  'focus',
  'analysis',
  'roots-changed',
  'analysis-progress',
  'thumbnail',
  'animation-data',
  'cleanup-proposal',
  'cleanup-plan',
  'cleanup-result',
  'resolution-plan',
  'resolution-result',
  'trash-sessions',
  'restore-result',
  'snippets',
  'error',
] as const satisfies readonly HostInbound['type'][];

/**
 * Which outbound messages a capability gates.
 *
 * Consulted by both the components (to disable a control) and the host adapters (to
 * refuse a message that arrives anyway). Two enforcement points for one rule is
 * deliberate: the UI's check is the affordance, the host's is the guarantee.
 */
export const CAPABILITY_BY_OUTBOUND_TYPE: Readonly<
  Partial<Record<HostOutbound['type'], keyof HostCapabilities>>
> = {
  'apply-cleanup-plan': 'canMutate',
  'apply-resolution-plan': 'canMutate',
  'restore-session': 'canRestore',
  'request-trash-sessions': 'canRestore',
  'reveal-asset': 'canRevealInFileManager',
  'open-reference': 'canOpenReference',
  'generate-snippet': 'canGenerateSnippet',
  'copy-to-clipboard': 'canCopyToClipboard',
};

/** Whether a host with these capabilities may accept this message. */
export function isPermitted(message: HostOutbound, capabilities: HostCapabilities): boolean {
  const required = CAPABILITY_BY_OUTBOUND_TYPE[message.type];
  if (!required) return true;
  return capabilities[required] === true;
}
