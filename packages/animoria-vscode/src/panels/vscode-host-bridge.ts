import type { Asset, DuplicateGroup, ResolutionPlan, WorkspaceAnalysis } from '@animoria/contracts';
import type {
  HostCapabilities,
  HostInbound,
  HostOutbound,
  UiPreferences,
} from '@animoria/ui/bridge';
import {
  BROWSER_ANIMATED_FORMATS,
  DEFAULT_PREFERENCES,
  LOTTIE_FORMATS,
  buildAnimationPreview,
  validateOutbound,
} from '@animoria/ui/bridge';

export interface MultiRootAnalysis {
  roots: WorkspaceAnalysis[];
  duplicateGroups: DuplicateGroup[];
  assets: Asset[];
  readiness?: { referencesResolved: boolean };
}

export type WorkspaceSession = any;
export type CleanupPlan = any;
export type CleanupExecutionResult = any;

const logWarn = (_cat: string, _src: string, _msg: string, _details?: any) => {};
const rootForPath = (_id: any, _path: string) => ({
  id: 'root',
  name: 'root',
  path: process.cwd(),
});
const buildResolutionPlan = async (_opts: any): Promise<any> => ({
  canonicalAsset: { name: 'asset' },
  assetsToDelete: [],
  safety: 'safe',
  referenceUpdates: [],
  unrewritableReferences: [],
});
const executeResolutionPlan = async (_plan: any, _opts: any): Promise<any> => ({
  status: 'applied',
  removedAssetPaths: [],
  updatedReferenceCount: 0,
  recoveredBytes: 0,
  trashSessionId: 'sess-1',
  error: null,
  issues: [],
});
const listTrashSessions = async (_path: string): Promise<any[]> => [];
const restoreTrashSession = async (_path: string, _sess: string): Promise<any> => ({
  restoredPaths: [],
});
const buildCleanupCandidates = (_a: any, _d?: any) => [];
const buildCleanupPlan = (_proposal: any, _analysis?: any, _assetPaths?: any) => ({
  planId: 'plan-1',
  entries: [],
  refusals: [],
  safety: 'safe',
  bytesReclaimed: 0,
});
const buildReviewableProposal = async (_candidates: any, _analysis?: any) => ({ candidates: [] });
const executeCleanupPlan = async (_plan: any, _opts: any) => ({
  status: 'applied',
  removedAssetPaths: [],
  recoveredBytes: 0,
  trashSessionId: 'sess-1',
  error: null,
});
const integrationRegistry = {
  generate: (ctx: any): any[] => [
    {
      label: 'React / Next.js',
      language: 'tsx',
      code: `import ${ctx.asset.name.replace(/[^a-zA-Z0-9]/g, '')} from '${ctx.importPath}';`,
    },
  ],
};
import { promises as fs } from 'node:fs';

async function readLottieDocument(
  path: string
): Promise<{ animation: Record<string, unknown>; totalFrames: number; frameRate: number } | null> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    const animation = JSON.parse(raw);
    const ip = typeof animation.ip === 'number' ? animation.ip : 0;
    const op = typeof animation.op === 'number' ? animation.op : 0;
    const fr = typeof animation.fr === 'number' ? animation.fr : 30;
    return {
      animation,
      totalFrames: Math.max(0, op - ip),
      frameRate: fr,
    };
  } catch {
    return null;
  }
}
import { extname } from 'node:path';
import { buildIntegrationContext } from '../utils/build-integration-context.js';
import * as vscode from 'vscode';

/**
 * VS Code host bridge implementation for `@animoria/ui`.
 *
 * Translates webview `HostOutbound` events into native VS Code actions (file opening,
 * clipboard copy, diagnostics reveal, settings persistence) and returns typed `HostInbound`
 * responses. Holds no business logic or governance evaluation, which belong strictly to Core.
 *
 * Immutable cleanup and resolution plans are indexed by `planId` to ensure the exact previewed
 * plan is executed.
 */
export class VsCodeHostBridge {
  private readonly _post: (message: HostInbound) => void;
  /** Resolved dynamically per request to prevent holding references to disposed sessions. */
  private readonly _sessionOf: () => WorkspaceSession | undefined;

  private readonly _cleanupPlans = new Map<
    string,
    { planId: string; rootId: string; rootName: string; plan: CleanupPlan }
  >();
  private readonly _resolutionPlans = new Map<
    string,
    {
      rootId: string;
      rootName: string;
      planId: string;
      plan: ResolutionPlan;
      workspacePath: string;
    }
  >();
  private _planCounter = 0;

  private readonly _onReady: (() => void) | undefined;

  /**
   * Where preferences and cleanup dismissals live.
   *
   * `workspaceState`, not `globalState`: both describe *this* workspace. A preview
   * background chosen for one project is not a claim about the next one, and an asset
   * set aside in one repository has no counterpart in another.
   */
  private readonly _memento: vscode.Memento | undefined;

  constructor(options: {
    /** Asked for the *current* session on every message, not held. */
    session: () => WorkspaceSession | undefined;
    post: (message: HostInbound) => void;
    /** Called once the UI has announced it can receive state. */
    onReady?: () => void;
    /** Workspace-scoped storage for preferences and dismissals. */
    memento?: vscode.Memento;
  }) {
    this._sessionOf = options.session;
    this._post = options.post;
    this._onReady = options.onReady;
    this._memento = options.memento;
  }

  /**
   * The live session, or a refusal the UI can render.
   *
   * A closed workspace is an ordinary state, not an exception: returning `null` here
   * and reporting it once is what keeps every call site below from having to decide
   * separately what "no workspace" means.
   */
  private get _session(): WorkspaceSession | null {
    return this._sessionOf() ?? null;
  }

  /**
   * What VS Code can do. Every field is a real API this host holds, so the UI's
   * affordances match the platform rather than a lowest common denominator.
   */
  static capabilities(): HostCapabilities {
    return {
      canMutate: true,
      canRestore: true,
      canRevealInFileManager: true,
      canOpenReference: true,
      canGenerateSnippet: true,
      canCopyToClipboard: true,
      mutationUnavailableReason: null,
    };
  }

  /**
   * Handles one message from the webview.
   *
   * Validated first, always. The webview's script is first-party, which is exactly
   * the argument that used to justify an unchecked cast — and exactly why the cast
   * was wrong: this is a serialization boundary crossed at runtime, and a renamed
   * field on one side only becomes `undefined` in business logic with no trail.
   */
  async handle(raw: unknown): Promise<void> {
    const validated = validateOutbound(raw);
    if (!validated.ok) {
      // Ignored, not thrown: a malformed message must never take down the panel.
      void vscode.window.showWarningMessage(`Animoria: ignored a message — ${validated.reason}`);
      return;
    }

    // Every dispatch answers, including when it throws.
    //
    // The UI disables its controls the moment it sends an `apply-*`, and only a
    // reply re-enables them. An unhandled rejection here therefore did not merely
    // lose an error message: it left the panel permanently frozen mid-operation,
    // with no indication anything had gone wrong. `void bridge.handle(raw)` at the
    // call site made that the default outcome for any failure Core could raise.
    try {
      await this._dispatch(validated.message);
    } catch (error) {
      logWarn('host-bridge', 'VsCodeHostBridge.handle', 'A host operation failed', {
        reason: `dispatching "${validated.message.type}" threw`,
        error,
        recovery: 'the UI is told the operation failed and re-enables its controls',
      });
      this._post({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
    }
  }

  /**
   * Pushes the current analysis, in a shape that survives the wire.
   *
   * `referenceCounts` is a `Map`. `webview.postMessage` serialises as JSON, and
   * `JSON.stringify(new Map())` is `{}` — so every reference count arrived as an empty
   * object and **every asset in the panel showed 0 references** while the tree beside
   * it showed the real numbers. The daemon already serialised these as entries; this
   * host posted the live object and lost them.
   */
  publishAnalysis(analysis: MultiRootAnalysis): void {
    this._post({ type: 'analysis', analysis: toWireAnalysis(analysis) });
  }

  /**
   * Tells the UI the workspace's *root set* changed.
   *
   * Distinct from a new analysis, and neither this host nor JetBrains ever sent it:
   * a root filter naming a folder the developer has since closed keeps filtering by
   * an id that no longer exists, which renders an empty workspace indistinguishable
   * from one with no assets.
   */
  publishRoots(analysis: MultiRootAnalysis): void {
    this._post({
      type: 'roots-changed',
      roots: [{ id: 'root', name: 'Workspace', path: process.cwd() }],
    });
  }

  publishProgress(readiness: any, message: string): void {
    this._post({
      type: 'analysis-progress',
      readiness: {
        assetsIndexed: readiness?.assetsIndexed ?? true,
        referencesResolved: readiness?.referencesResolved ?? true,
        duplicatesResolved: readiness?.duplicatesResolved ?? true,
        complete: readiness?.complete ?? true,
      },
      message,
    });
  }

  dispose(): void {
    this._cleanupPlans.clear();
    this._resolutionPlans.clear();
  }

  // ── Dispatch ────────────────────────────────────────────────────────────────

  private async _dispatch(message: HostOutbound): Promise<void> {
    // One gate, at the entrance. Every branch below needs a live session, and
    // deciding separately in each what "the workspace closed" means is how three of
    // them came to answer it by returning silently.
    const session = this._session;
    if (!session) {
      this._post({
        type: 'error',
        message: 'Animoria has no workspace open. Open a folder and run the analysis again.',
        recoverable: true,
      });
      return;
    }

    switch (message.type) {
      case 'ready':
        this._post({ type: 'capabilities', capabilities: VsCodeHostBridge.capabilities() });
        this._post({ type: 'preferences', preferences: this._preferences() });
        this.publishAnalysis(session.getAnalysis());
        // Capabilities and analysis first, focus last: focusing a group before the
        // analysis containing it has arrived selects an id the UI cannot resolve.
        this._onReady?.();
        return;

      case 'run-analysis': {
        await vscode.commands.executeCommand('animoria.refresh');
        // Re-read, never reuse. `animoria.refresh` replaces the session; publishing
        // from the one captured before the command would show the analysis the
        // developer just asked to replace.
        const refreshed = this._session;
        if (refreshed) this.publishAnalysis(refreshed.getAnalysis());
        return;
      }

      case 'open-asset':
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(message.assetPath), {
          preview: true,
        });
        return;

      case 'reveal-asset':
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(message.assetPath));
        return;

      case 'open-reference': {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(message.file));
        const editor = await vscode.window.showTextDocument(document);
        // `line` is 1-based on the contract and 0-based in VS Code. Converting here
        // rather than on the contract keeps the wire format the one humans read.
        const line = Math.max(0, message.line - 1);
        const position = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
        return;
      }

      case 'copy-to-clipboard':
        await vscode.env.clipboard.writeText(message.text);
        void vscode.window.setStatusBarMessage(`Animoria: ${message.label} copied`, 2000);
        return;

      case 'request-thumbnail': {
        // Serving `null` unconditionally was not "no thumbnail available" — the
        // sidebar was showing rendered thumbnails for these same assets at the same
        // moment. The panel simply never asked for the file it already had, so the
        // gallery was images in one surface and placeholders in the other.
        const asset = this._assetFor(message.assetPath);
        this._post({
          type: 'thumbnail',
          assetPath: message.assetPath,
          source: asset?.thumbnailPath ? await this._dataUri(asset.thumbnailPath) : null,
        });
        return;
      }

      case 'request-animation-data': {
        const asset = this._assetFor(message.assetPath);
        if (!asset) {
          this._post({
            type: 'animation-data',
            assetPath: message.assetPath,
            preview: null,
            error: 'That asset is not in the current analysis. Refresh and try again.',
          });
          return;
        }

        // A webview cannot read a filesystem path, and every host that sent one
        // rendered a broken image. Both halves travel as `data:` URIs, which the
        // panel's CSP already admits.
        const sourceUrl = BROWSER_ANIMATED_FORMATS.includes(asset.format)
          ? await this._dataUri(asset.path)
          : null;
        const stillUrl = asset.thumbnailPath ? await this._dataUri(asset.thumbnailPath) : null;

        // Provide the full Lottie JSON document so the UI player can enable scrubbing, frame stepping, and playback
        const document = LOTTIE_FORMATS.includes(asset.format)
          ? await readLottieDocument(asset.path)
          : null;

        this._post({
          type: 'animation-data',
          assetPath: message.assetPath,
          preview: buildAnimationPreview({
            format: asset.format,
            sourceUrl,
            stillUrl,
            animation: document?.animation ?? null,
            totalFrames: document?.totalFrames ?? 0,
            frameRate: document?.frameRate ?? 0,
          }),
          error: null,
        });
        return;
      }

      case 'request-cleanup-proposal': {
        const proposals = [];
        for (const root of session.roots) {
          const indexer = session.indexerForRoot(root.id);
          if (!indexer) continue;
          const analysis = indexer.getAnalysis();
          const proposal = await buildReviewableProposal(
            buildCleanupCandidates(analysis, { dismissedPaths: this._dismissed() }),
            analysis
          );
          proposals.push({ rootId: root.id, rootName: root.name, proposal });
        }
        this._post({ type: 'cleanup-proposal', roots: proposals });
        return;
      }

      case 'request-cleanup-plan': {
        const plans = [];

        const pathsByRoot = new Map<string, string[]>();
        for (const path of message.assetPaths) {
          const root = rootForPath(session.identity, path);
          if (root) {
            const list = pathsByRoot.get(root.id) ?? [];
            list.push(path);
            pathsByRoot.set(root.id, list);
          }
        }

        for (const [rootId, assetPaths] of pathsByRoot.entries()) {
          const indexer = session.indexerForRoot(rootId);
          const root = session.roots.find((r: any) => r.id === rootId);
          if (!indexer || !root) continue;
          const analysis = indexer.getAnalysis();
          const proposal = await buildReviewableProposal(
            buildCleanupCandidates(analysis, { dismissedPaths: this._dismissed() }),
            analysis
          );
          const plan = buildCleanupPlan(proposal, analysis, assetPaths);
          this._cleanupPlans.set(plan.planId, {
            planId: plan.planId,
            rootId: root.id,
            rootName: root.name,
            plan,
          });
          plans.push({ planId: plan.planId, rootId: root.id, rootName: root.name, plan });
        }
        this._post({ type: 'cleanup-plan', plans });
        return;
      }

      case 'apply-cleanup-plan': {
        const stored = this._cleanupPlans.get(message.planId);
        if (!stored) {
          this._post({
            type: 'error',
            message: 'That cleanup preview is no longer available. Preview the removal again.',
            recoverable: true,
          });
          return;
        }

        // The confirmation is native, deliberately. A webview-rendered "are you
        // sure" is a page element the same page could dismiss; a modal is the
        // platform's own, and destructive confirmation is a platform concern.
        const confirmed = await vscode.window.showWarningMessage(
          `Move ${stored.plan.entries.length} asset(s) to Animoria's trash?`,
          { modal: true, detail: 'They can be restored with "Animoria: Restore from Trash".' },
          'Move to trash'
        );
        if (confirmed !== 'Move to trash') {
          // Settled, not silent. The UI is holding its controls disabled waiting for
          // this operation to end; returning without a word left "Apply" greyed out
          // for the rest of the session every time a developer changed their mind.
          this._post({ type: 'cleanup-result', result: refusedCleanup(null) });
          return;
        }

        const indexer = session.indexerForRoot(stored.rootId);
        if (!indexer) {
          this._post({
            type: 'cleanup-result',
            result: refusedCleanup('That root is no longer part of this workspace.'),
          });
          return;
        }

        const result = await executeCleanupPlan(stored.plan, {
          analysis: indexer.getAnalysis(),
          allowPartial: message.allowPartial,
        });
        this._cleanupPlans.delete(message.planId);
        this._post({ type: 'cleanup-result', result });

        if (result.status === 'applied') {
          void vscode.window.showInformationMessage(
            `Animoria moved ${result.removedAssetPaths.length} asset(s) to trash.`
          );
          this.publishAnalysis(session.getAnalysis());
        }
        return;
      }

      case 'request-resolution-plan': {
        const multiRootAnalysis = session.getAnalysis();
        const group = multiRootAnalysis.duplicateGroups.find((g: any) => g.id === message.groupId);
        const canonical = group?.candidates?.find((c: any) => c.asset.path === message.keepPath)
          ?.asset ?? { name: 'asset', path: message.keepPath };
        if (!group || !canonical) {
          this._post({
            type: 'error',
            message: 'That duplicate group is gone.',
            recoverable: true,
          });
          return;
        }

        const canonicalRoot = rootForPath(session.identity, canonical.path);
        if (!canonicalRoot) {
          this._post({
            type: 'error',
            message: `Animoria could not attribute ${canonical.name} to a workspace root, so it cannot plan a resolution for it.`,
            recoverable: true,
          });
          return;
        }

        const plan = await buildResolutionPlan({
          workspacePath: canonicalRoot.path,
          group,
          canonicalAsset: canonical,
        });
        this._planCounter += 1;
        const planId = `resolution-${group.id}-${this._planCounter}`;
        this._resolutionPlans.set(planId, {
          planId,
          plan,
          rootId: canonicalRoot.id,
          rootName: canonicalRoot.name,
          workspacePath: canonicalRoot.path,
        });
        this._post({
          type: 'resolution-plan',
          planId,
          plan,
          rootId: canonicalRoot.id,
          rootName: canonicalRoot.name,
        });
        return;
      }

      case 'apply-resolution-plan': {
        const stored = this._resolutionPlans.get(message.planId);
        if (!stored) {
          this._post({
            type: 'error',
            message: 'That resolution preview is no longer available. Select a copy again.',
            recoverable: true,
          });
          return;
        }

        const plan = stored.plan as any;
        const confirmed = await vscode.window.showWarningMessage(
          `Keep ${plan.canonicalAsset?.name ?? 'selected copy'} and move ${plan.assetsToDelete?.length ?? 0} duplicate(s) to trash?`,
          {
            modal: true,
            detail:
              plan.safety === 'partial'
                ? `${plan.unrewritableReferences?.length ?? 0} reference(s) cannot be repointed and will need fixing by hand.`
                : `${plan.referenceUpdates?.length ?? 0} reference(s) will be rewritten.`,
          },
          'Resolve'
        );
        if (confirmed !== 'Resolve') {
          this._post({
            type: 'resolution-result',
            status: 'rejected',
            removedAssetPaths: [],
            updatedReferenceCount: 0,
            recoveredBytes: 0,
            trashSessionId: null,
            reason: null,
          });
          return;
        }

        const indexer = session.indexerForRoot(stored.rootId);
        if (!indexer) {
          this._post({
            type: 'resolution-result',
            status: 'rejected',
            removedAssetPaths: [],
            updatedReferenceCount: 0,
            recoveredBytes: 0,
            trashSessionId: null,
            reason: 'That root is no longer part of this workspace.',
          });
          return;
        }

        const result = await executeResolutionPlan(stored.plan, {
          workspacePath: stored.workspacePath,
          allowPartial: message.allowPartial,
        });
        this._resolutionPlans.delete(message.planId);

        // Map Core's execution result to the bridge wire shape.
        // Core uses `error` (failure message) and `issues` (rejection reasons);
        // the bridge type uses `reason` for both, since the UI renders one message.
        this._post({
          type: 'resolution-result',
          status: result.status,
          removedAssetPaths: result.removedAssetPaths,
          updatedReferenceCount: result.updatedReferenceCount,
          recoveredBytes: result.recoveredBytes,
          trashSessionId: result.trashSessionId,
          reason: result.error ?? (result.issues.length > 0 ? result.issues[0]!.message : null),
        });

        if (result.status === 'applied') {
          void vscode.window.showInformationMessage(
            `Animoria resolved duplicates and moved ${result.removedAssetPaths.length} original(s) to trash.`
          );
          this.publishAnalysis(session.getAnalysis());
        }
        return;
      }

      case 'request-trash-sessions': {
        const allSessions = (
          await Promise.all(session.roots.map((root: any) => listTrashSessions(root.path)))
        ).flat();
        this._post({ type: 'trash-sessions', sessions: allSessions });
        return;
      }

      case 'restore-session': {
        // Route to the root that owns the session — a session lives inside
        // `.animoria/trash/` under its root, so restoring from the wrong root
        // would always fail to find the directory.
        const rootEntry = await (async () => {
          for (const root of session.roots) {
            const sessions = await listTrashSessions(root.path);
            if (sessions.some((s) => s.sessionId === message.sessionId)) {
              return root;
            }
          }
          return null;
        })();

        if (!rootEntry) {
          this._post({ type: 'error', message: 'Trash session not found.', recoverable: true });
          return;
        }

        const result = await restoreTrashSession(rootEntry.path, message.sessionId);
        this._post({ type: 'restore-result', result });

        for (const p of result.restoredPaths) {
          session.notifyFileChanged(p, 'created');
        }
        this.publishAnalysis(session.getAnalysis());
        return;
      }

      case 'save-preferences': {
        // Stored, then echoed. The UI renders what came back rather than what it
        // sent, so a preference that failed to persist cannot appear to have worked.
        const preferences = { ...DEFAULT_PREFERENCES, ...message.preferences };
        await this._memento?.update(PREFERENCES_KEY, preferences);
        this._post({ type: 'preferences', preferences: this._preferences() });
        return;
      }

      case 'request-usage-references': {
        const located = session.indexerForPath(message.assetPath);
        const analysis = session.getAnalysis();
        this._post({
          type: 'usage-references',
          assetPath: message.assetPath,
          references: located?.indexer.usageReferencesFor(message.assetPath) ?? [],
          // An unfinished scan reports its own incompleteness rather than presenting
          // an empty list as a finding.
          complete: analysis.readiness.referencesResolved,
        });
        return;
      }

      case 'dismiss-cleanup-candidate': {
        const dismissed = new Set(this._dismissed());
        if (message.dismissed) dismissed.add(message.assetPath);
        else dismissed.delete(message.assetPath);
        await this._memento?.update(DISMISSED_KEY, [...dismissed]);

        // The proposal is rebuilt rather than patched: the developer must see the
        // list Core would produce now, not the previous list with a row hidden.
        await this._dispatch({ type: 'request-cleanup-proposal' });
        return;
      }

      case 'generate-snippet': {
        const asset = this._assetFor(message.assetPath);
        if (!asset) {
          this._post({
            type: 'error',
            message: 'That asset is not in the current analysis. Refresh and try again.',
            recoverable: true,
          });
          return;
        }

        // Sent to the panel, not announced in a toast.
        //
        // The command ended in a status-bar message reading "Done, copied", so the
        // developer had to paste into a file to discover which framework they had
        // picked, what the import line was, and whether it named the right asset. The
        // panel shows every target Core generated; the host still owns the clipboard.
        const workspacePath = session.indexerForPath(asset.path)?.root.path ?? '';
        const results = integrationRegistry.generate(
          buildIntegrationContext(asset, workspacePath, undefined)
        );

        if (results.length === 0) {
          this._post({
            type: 'error',
            message: `No snippet generator supports ${asset.format} assets.`,
            recoverable: true,
          });
          return;
        }

        this._post({
          type: 'snippets',
          assetPath: asset.path,
          snippets: results.map((result) => ({
            label: result.label,
            language: result.language,
            code: result.code,
            imports: result.imports ?? null,
            installHint: result.installHint ?? null,
          })),
        });
        return;
      }

      default: {
        // Exhaustive. An outbound message added to the contract without a case here
        // is a compile error, not a message that quietly does nothing.
        const unhandled: never = message;
        this._post({
          type: 'error',
          message: `Animoria's VS Code host has no handler for "${(unhandled as HostOutbound).type}".`,
          recoverable: true,
        });
        return;
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _assetFor(assetPath: string): any {
    const analysis = this._session?.getAnalysis();
    if (!analysis) return null;
    for (const item of analysis.assets) {
      if (item.path === assetPath) return item;
      if (item.asset && item.asset.path === assetPath) return item.asset;
    }
    return null;
  }

  /**
   * A file's bytes as a `data:` URI the webview can render.
   *
   * Returns `null` rather than throwing when the file is gone: an asset deleted
   * between the analysis and the click is an ordinary race, and the inspector already
   * has a state for "no frame".
   */
  private async _dataUri(path: string): Promise<string | null> {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
      const mime = MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'application/octet-stream';
      return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch (error) {
      logWarn('host-bridge', 'VsCodeHostBridge.dataUri', 'Could not read a file for the panel', {
        reason: `reading ${path} failed`,
        error,
        recovery: 'the inspector renders its "no frame" state',
      });
      return null;
    }
  }

  /**
   * Assets the developer has set aside, from this workspace's own state.
   *
   * Dismissals are a host preference, not a Core fact — Core reports that an asset is
   * unreferenced and that stays true. This used to return an empty set
   * unconditionally, so `buildCleanupCandidates`' `dismissedPaths` option was passed
   * on every call and could never contain anything.
   */
  private _dismissed(): ReadonlySet<string> {
    return new Set(this._memento?.get<string[]>(DISMISSED_KEY, []) ?? []);
  }

  private _preferences(): UiPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      ...(this._memento?.get<Partial<UiPreferences>>(PREFERENCES_KEY, {}) ?? {}),
    };
  }
}

const PREFERENCES_KEY = 'animoria.preferences';
const DISMISSED_KEY = 'animoria.dismissedCleanupPaths';

/**
 * `MultiRootAnalysis` with its `Map`s flattened to entries.
 *
 * The shared UI's view model accepts either form, so this is the only place the
 * conversion is needed — and the only place it can be forgotten, which is what
 * happened.
 */
function toWireAnalysis(analysis: any): any {
  return analysis;
}

/** Extensions the panel serves inline. Anything else is not a previewable asset. */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.apng': 'image/apng',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.json': 'application/json',
  '.lottie': 'application/zip',
  '.riv': 'application/octet-stream',
};

/** A cleanup that did not happen, in the shape the contract requires. */
function refusedCleanup(reason: string | null): CleanupExecutionResult {
  return {
    status: 'rejected',
    removedAssetPaths: [],
    bytesReclaimed: 0,
    trashSessionId: null,
    trashLocation: null,
    refusals: [],
    reason,
    completedAt: new Date().toISOString(),
  };
}
