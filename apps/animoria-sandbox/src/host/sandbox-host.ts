import type { Asset, ResolutionPlan, UsageReference } from '@animoria/contracts';
import type {
  HostCapabilities,
  HostInbound,
  HostOutbound,
  MultiRootAnalysis,
  RootCleanupPlan,
  RootCleanupProposal,
  UiPreferences,
} from '@animoria/ui/bridge';
import {
  DEFAULT_PREFERENCES,
  LOTTIE_FORMATS,
  buildAnimationPreview,
  validateOutbound,
} from '@animoria/ui/bridge';

/**
 * The sandbox's `HostBridge` implementation — Animoria's reference host. It
 * implements the same contract VS Code and JetBrains do, with every screen
 * intact, but declares `canMutate: false`.
 *
 * That guarantee is enforced in three places: here (mutating messages are
 * refused before they reach the network), in the components (the control is
 * disabled with a visible reason), and in `vite.config.ts` (every non-GET
 * `/api/*` returns 405). Only the third survives someone editing this file,
 * which is why it exists even though the other two should already prevent it.
 */

export const SANDBOX_CAPABILITIES: HostCapabilities = {
  canMutate: false,
  canRestore: false,
  // Logged as a no-op rather than disabled, so the evidence panel stays reviewable.
  canRevealInFileManager: false,
  canOpenReference: true,
  canGenerateSnippet: true,
  canCopyToClipboard: true,
  mutationUnavailableReason:
    'This action is unavailable in the Sandbox. The harness is read-only by construction — it exercises every screen without touching the filesystem.',
};

type WireAnalysis = MultiRootAnalysis;

/** One line in the harness's event log. Sandbox-only instrumentation. */
export interface SandboxLogEntry {
  readonly at: string;
  readonly direction: 'ui→host' | 'host→ui' | 'refused';
  readonly type: string;
  readonly detail: string;
}

export interface SandboxHostOptions {
  /** Called for every message in either direction, for the harness event console. */
  readonly onLog?: (entry: SandboxLogEntry) => void;
}

/**
 * Serves the shared UI from the read-only dev bridge. Requests go to `/api/*`,
 * which `vite.config.ts` guarantees is GET-only, and the analysis is Core's
 * own rather than one computed here.
 */
export class SandboxHost {
  private readonly _listeners = new Set<(message: HostInbound) => void>();
  private readonly _onLog: ((entry: SandboxLogEntry) => void) | undefined;
  private _analysis: MultiRootAnalysis | null = null;
  // Preferences and dismissals in `localStorage`: view state, not the workspace,
  // so persisting it doesn't violate the read-only guarantee.
  private _preferences: UiPreferences = readStored(
    'animoria.sandbox.preferences',
    DEFAULT_PREFERENCES
  );
  private _dismissed = new Set<string>(readStored<string[]>('animoria.sandbox.dismissed', []));

  constructor(options: SandboxHostOptions = {}) {
    this._onLog = options.onLog;
  }

  // ── HostBridge ─────────────────────────────────────────────────────────────

  send(raw: HostOutbound): void {
    const validated = validateOutbound(raw);
    if (!validated.ok) {
      this._log('refused', 'invalid', validated.reason);
      return;
    }
    void this._handle(validated.message);
  }

  subscribe(listener: (message: HostInbound) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _emit(message: HostInbound): void {
    this._log('host→ui', message.type, '');
    for (const listener of this._listeners) listener(message);
  }

  private _log(direction: SandboxLogEntry['direction'], type: string, detail: string): void {
    this._onLog?.({ at: new Date().toISOString(), direction, type, detail });
  }

  private _refuse(type: string): void {
    this._log('refused', type, SANDBOX_CAPABILITIES.mutationUnavailableReason ?? '');
    this._emit({
      type: 'error',
      message: SANDBOX_CAPABILITIES.mutationUnavailableReason ?? 'Unavailable in the Sandbox.',
      recoverable: true,
    });
  }

  private async _handle(message: HostOutbound): Promise<void> {
    this._log('ui→host', message.type, '');

    switch (message.type) {
      case 'ready':
        this._emit({ type: 'capabilities', capabilities: SANDBOX_CAPABILITIES });
        this._emit({ type: 'preferences', preferences: this._preferences });
        await this._runAnalysis();
        return;

      case 'run-analysis':
        await this._runAnalysis();
        return;

      case 'request-thumbnail': {
        const asset = this._assetFor(message.assetPath);
        const thumbnailPath = asset?.thumbnail_path ?? asset?.path;
        this._emit({
          type: 'thumbnail',
          assetPath: message.assetPath,
          source: thumbnailPath ? this._fileUrl(thumbnailPath) : null,
        });
        return;
      }

      case 'request-animation-data': {
        const asset = this._assetFor(message.assetPath);
        if (!asset) {
          this._emit({
            type: 'animation-data',
            assetPath: message.assetPath,
            preview: null,
            error: 'That asset is not in the current analysis.',
          });
          return;
        }
        // The document itself for a Lottie, so the harness can play it, not just show a still.
        const document = LOTTIE_FORMATS.includes(asset.format)
          ? await this._get<{
              animation: unknown;
              totalFrames: number;
              frameRate: number;
            } | null>(`/api/lottie-document?assetPath=${encodeURIComponent(asset.path)}`)
          : null;

        const stillUrl = asset.thumbnail_path ? this._fileUrl(asset.thumbnail_path) : null;

        this._emit({
          type: 'animation-data',
          assetPath: message.assetPath,
          preview: buildAnimationPreview({
            format: asset.format,
            sourceUrl: this._fileUrl(asset.path),
            stillUrl,
            animation: document?.animation ?? null,
            totalFrames: document?.totalFrames ?? 0,
            frameRate: document?.frameRate ?? 0,
          }),
          error: null,
        });
        return;
      }

      case 'save-preferences':
        this._preferences = { ...DEFAULT_PREFERENCES, ...message.preferences };
        writeStored('animoria.sandbox.preferences', this._preferences);
        this._emit({ type: 'preferences', preferences: this._preferences });
        return;

      case 'request-usage-references': {
        const response = await this._get<{
          references: readonly UsageReference[];
          complete: boolean;
        }>(`/api/usage-references?assetPath=${encodeURIComponent(message.assetPath)}`);
        this._emit({
          type: 'usage-references',
          assetPath: message.assetPath,
          references: response?.references ?? [],
          complete: response?.complete ?? false,
        });
        return;
      }

      case 'dismiss-cleanup-candidate':
        // View state, not a workspace mutation.
        if (message.dismissed) this._dismissed.add(message.assetPath);
        else this._dismissed.delete(message.assetPath);
        writeStored('animoria.sandbox.dismissed', [...this._dismissed]);
        await this._handle({ type: 'request-cleanup-proposal' });
        return;

      case 'request-cleanup-proposal': {
        const dismissed = [...this._dismissed].join('\n');
        const proposals = await this._get<RootCleanupProposal[]>(
          `/api/cleanup-proposal?dismissed=${encodeURIComponent(dismissed)}`
        );
        if (proposals) this._emit({ type: 'cleanup-proposal', roots: proposals });
        return;
      }

      case 'request-cleanup-plan': {
        const plans = await this._get<RootCleanupPlan[]>(
          `/api/cleanup-plan?paths=${encodeURIComponent(message.assetPaths.join('\n'))}`
        );
        if (plans) this._emit({ type: 'cleanup-plan', plans });
        return;
      }

      case 'request-resolution-plan': {
        const response = await this._get<{
          planId: string;
          plan: ResolutionPlan;
          rootId: string;
          rootName: string;
        }>(
          `/api/resolution-plan?groupId=${encodeURIComponent(
            message.groupId
          )}&keepPath=${encodeURIComponent(message.keepPath)}`
        );
        if (response) {
          this._emit({
            type: 'resolution-plan',
            planId: response.planId,
            plan: response.plan,
            rootId: response.rootId,
            rootName: response.rootName,
          });
        }
        return;
      }

      // ── Refused: everything that would mutate ──
      // Note these are *handled*, not omitted. The UI has already disabled the
      // control; a message arriving anyway means a bug or a hand-crafted call, and
      // silently ignoring it would make that bug invisible.
      case 'apply-cleanup-plan':
      case 'apply-resolution-plan':
      case 'restore-session':
      case 'request-trash-sessions':
        this._refuse(message.type);
        return;

      case 'generate-snippet': {
        const snippets = await this._get<
          readonly {
            label: string;
            language: string;
            code: string;
            imports: string | null;
            installHint: string | null;
          }[]
        >(`/api/snippets?assetPath=${encodeURIComponent(message.assetPath)}`);

        if (snippets && snippets.length > 0) {
          this._emit({ type: 'snippets', assetPath: message.assetPath, snippets });
        } else {
          this._emit({
            type: 'error',
            message: 'No snippet generator supports this asset.',
            recoverable: true,
          });
        }
        return;
      }

      case 'open-asset':
      case 'reveal-asset':
      case 'open-reference':
        // A harness has no editor to navigate. Logged so the flow is reviewable.
        this._log('host→ui', message.type, 'no-op: the Sandbox has no editor');
        return;

      case 'copy-to-clipboard':
        await navigator.clipboard?.writeText(message.text).catch(() => {
          this._log('refused', 'copy-to-clipboard', 'clipboard unavailable');
        });
        return;

      default: {
        // Exhaustive: a new outbound message without a case here fails the build
        // rather than silently vanishing at runtime.
        const unhandled: never = message;
        this._log('refused', (unhandled as HostOutbound).type, 'no handler in the Sandbox host');
        return;
      }
    }
  }

  /** The asset Core attributed to this path, or `null`. Never re-derived from the path. */
  private _assetFor(assetPath: string): Asset | null {
    if (!this._analysis) return null;
    for (const item of this._analysis.assets as readonly unknown[]) {
      if (!item || typeof item !== 'object') continue;
      if (
        'path' in item &&
        typeof (item as Asset).path === 'string' &&
        (item as Asset).path === assetPath
      ) {
        return item as Asset;
      }
      if (
        'asset' in item &&
        (item as { asset?: { path?: string } }).asset &&
        (item as { asset: Asset }).asset.path === assetPath
      ) {
        return (item as { asset: Asset }).asset;
      }
    }
    return null;
  }

  private _fileUrl(path: string): string {
    return `/api/file?path=${encodeURIComponent(path)}`;
  }

  private async _runAnalysis(): Promise<void> {
    this._emit({
      type: 'analysis-progress',
      readiness: {
        assetsIndexed: false,
        referencesResolved: false,
        duplicatesResolved: false,
        complete: false,
      },
      message: 'Indexing the fixture workspace…',
    });

    // `referenceCounts` is a `Map` in the contract but an array of pairs on the
    // wire — named as `WireAnalysis` rather than cast to `any`.
    const analysis = await this._get<WireAnalysis>('/api/analysis');
    if (!analysis) return;

    this._analysis = analysis;
    this._emit({ type: 'analysis', analysis });
  }

  private async _get<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this._emit({
          type: 'error',
          message: `${url} responded ${response.status}. Is the dev bridge running?`,
          recoverable: true,
        });
        return null;
      }
      return (await response.json()) as T;
    } catch (err) {
      this._emit({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        recoverable: true,
      });
      return null;
    }
  }
}

/** Reads one JSON value from `localStorage`, falling back rather than throwing. */
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    console.warn(`[animoria-sandbox] could not read ${key}; using defaults`);
    return fallback;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`[animoria-sandbox] could not persist ${key}`);
  }
}
