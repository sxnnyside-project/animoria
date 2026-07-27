import type {
  AnimoriaAsset,
  AnimoriaStaticAsset,
  RuleEngineReport,
  HealthScoreReport,
} from '@animoria/core';

/** A message posted between the mock frontend and this mock extension host — shape varies by `command`. */
interface MockMessage {
  command: string;
  target?: string;
  [key: string]: unknown;
}

/** One row of a Bulk Cleanup decision batch, as sent by the `executeCleanup` command. */
interface CleanupDecision {
  decision: string;
  path: string;
}

// We define a rich mock state for offline fallback
export const MOCK_ASSETS_RICH: AnimoriaAsset[] = [
  {
    path: '/workspace/assets/animations/success.json',
    name: 'success.json',
    stem: 'success',
    format: 'lottie',
    sizeBytes: 4200,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'lottie',
      fps: 30,
      durationSeconds: 3,
      totalFrames: 90,
      width: 512,
      height: 512,
      layerCount: 8,
      markers: [
        { name: 'intro', frame: 0, durationFrames: 30 },
        { name: 'loop', frame: 30, durationFrames: 60 },
      ],
    },
  },
  {
    path: '/workspace/assets/animations/success-copy.json',
    name: 'success-copy.json',
    stem: 'success-copy',
    format: 'lottie',
    sizeBytes: 4200,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'lottie',
      fps: 30,
      durationSeconds: 3,
      totalFrames: 90,
      width: 512,
      height: 512,
      layerCount: 8,
    },
  },
  {
    path: '/workspace/assets/animations/loading.json',
    name: 'loading.json',
    stem: 'loading',
    format: 'lottie',
    sizeBytes: 3800,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'lottie',
      fps: 30,
      durationSeconds: 2,
      totalFrames: 60,
      width: 256,
      height: 256,
      layerCount: 3,
    },
  },
  {
    path: '/workspace/assets/animations/confetti.json',
    name: 'confetti.json',
    stem: 'confetti',
    format: 'lottie',
    sizeBytes: 5100,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'lottie',
      fps: 60,
      durationSeconds: 4,
      totalFrames: 240,
      width: 1024,
      height: 1024,
      layerCount: 15,
    },
  },
  {
    path: '/workspace/assets/animations/logo.rive',
    name: 'logo.rive',
    stem: 'logo',
    format: 'rive',
    sizeBytes: 185200,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'rive',
      width: 800,
      height: 600,
      durationSeconds: 5,
      artboards: ['main', 'compact'],
      stateMachines: ['StateMachine1', 'HoverTransition'],
      animations: ['idle', 'rotate', 'success_trigger'],
    },
  },
  {
    path: '/workspace/assets/animations/loader.gif',
    name: 'loader.gif',
    stem: 'loader',
    format: 'gif',
    sizeBytes: 154000,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'gif',
      width: 128,
      height: 128,
      durationSeconds: 1.5,
      frameCount: 45,
      loopCount: 0,
    },
  },
  {
    path: '/workspace/assets/animations/animated-wave.svg',
    name: 'animated-wave.svg',
    stem: 'animated-wave',
    format: 'animated-svg',
    sizeBytes: 12000,
    mtime: Date.now(),
    status: 'parsed',
    metadata: {
      format: 'animated-svg',
      width: 400,
      height: 200,
      durationSeconds: 8,
      animationType: 'css',
      elementCount: 12,
    },
  },
  {
    path: '/workspace/assets/animations/error-example.json',
    name: 'error-example.json',
    stem: 'error-example',
    format: 'lottie',
    sizeBytes: 200,
    mtime: Date.now(),
    status: 'error',
    error: 'Validation failed: structural key "layers" is missing',
  },
];

export const MOCK_STATIC_ASSETS: AnimoriaStaticAsset[] = [
  {
    path: '/workspace/assets/images/logo-static.png',
    name: 'logo-static.png',
    stem: 'logo-static',
    format: 'png',
    sizeBytes: 12500,
    mtime: Date.now(),
  },
  {
    path: '/workspace/assets/images/background.jpg',
    name: 'background.jpg',
    stem: 'background',
    format: 'jpeg',
    sizeBytes: 122800,
    mtime: Date.now(),
  },
];

export const MOCK_REFERENCE_COUNTS: [string, number][] = [
  ['/workspace/assets/animations/success.json', 2],
  ['/workspace/assets/animations/success-copy.json', 1],
  ['/workspace/assets/animations/loading.json', 0],
  ['/workspace/assets/animations/confetti.json', 12],
  ['/workspace/assets/animations/logo.rive', 1],
  ['/workspace/assets/animations/loader.gif', 0],
  ['/workspace/assets/animations/animated-wave.svg', 1],
  ['/workspace/assets/animations/error-example.json', 0],
];

export const MOCK_RULE_REPORT: RuleEngineReport = {
  diagnostics: [
    {
      ruleId: 'no-duplicate-content',
      severity: 'error',
      asset: MOCK_ASSETS_RICH[0]!,
      message: 'success.json shares identical content with success-copy.json',
    },
    {
      ruleId: 'no-duplicate-content',
      severity: 'error',
      asset: MOCK_ASSETS_RICH[1]!,
      message: 'success-copy.json shares identical content with success.json',
    },
    {
      ruleId: 'no-gif',
      severity: 'warning',
      asset: MOCK_ASSETS_RICH[5]!,
      message: 'GIF format is discouraged. Consider migrating to Rive or SVG animations.',
    },
    {
      ruleId: 'max-file-size-kb',
      severity: 'warning',
      asset: MOCK_ASSETS_RICH[4]!,
      message: 'logo.rive (181.2KB) exceeds the configured limit of 100KB.',
      details: { limitKb: 100, actualKb: 181.2 },
    },
  ],
  configErrors: [],
  evaluatedRuleIds: ['no-duplicate-content', 'no-gif', 'max-file-size-kb'],
  durationMs: 4,
};

export const MOCK_HEALTH_SCORE: HealthScoreReport = {
  score: 72,
  totalAssetCount: 8,
  totalDiagnosticCount: 4,
  categories: [],
  recommendations: [
    {
      ruleId: 'no-duplicate-content',
      potentialScoreRecovery: 15,
      message: 'Duplicate animation assets exist',
    },
    {
      ruleId: 'max-file-size-kb',
      potentialScoreRecovery: 8,
      message: 'Asset files exceed size limits',
    },
    { ruleId: 'no-gif', potentialScoreRecovery: 5, message: 'Discouraged GIF formats used' },
  ],
  generatedAt: new Date().toISOString(),
  durationMs: 2,
};

export class MockExtensionHost {
  private _connected = false;
  private _assetsState: AnimoriaAsset[] = [...MOCK_ASSETS_RICH];
  private _staticAssetsState: AnimoriaStaticAsset[] = [...MOCK_STATIC_ASSETS];
  private _referenceCountsState: [string, number][] = [...MOCK_REFERENCE_COUNTS];
  private _ruleReportState: RuleEngineReport = { ...MOCK_RULE_REPORT };
  private _healthScoreState: HealthScoreReport = { ...MOCK_HEALTH_SCORE };

  constructor() {
    const isSandbox =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:');
    if (!isSandbox) {
      console.log('[Animoria Host] Running in native IDE environment. Mock host disabled.');
      return;
    }

    // Ping Vite dev server bridge
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          this._connected = true;
          console.log('[Mock Extension Host] Connected to real WorkspaceIndexer bridge.');
        }
      })
      .catch(() => {
        console.log(
          '[Mock Extension Host] Dev server bridge offline. Using offline mock datasets.'
        );
      });

    window.addEventListener('message', (e) => {
      if (e.data && e.data.target === 'extension') {
        this._handleFrontendMessage(e.data);
      }
    });
  }

  private _postToFrontend(command: string, data: Record<string, unknown>) {
    window.postMessage(
      {
        command,
        ...data,
      },
      '*'
    );
  }

  private async _handleFrontendMessage(message: MockMessage) {
    if (!message || !message.command) return;

    console.log(`[Mock Extension Host] Received: ${message.command}`, message);

    if (this._connected) {
      // Query dev server bridge
      switch (message.command) {
        case 'scan':
          this._postToFrontend('scanProgress', {
            message: 'Initializing indexer from dev server bridge...',
            index: 10,
            total: 100,
          });
          try {
            const res = await fetch('/api/snapshot');
            const snap = await res.json();
            this._postToFrontend('scanComplete', {
              assets: snap.assets,
              staticAssets: snap.staticAssets,
              ruleReport: snap.ruleReport,
              healthScore: snap.healthScore,
              referenceCounts: snap.referenceCounts,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this._postToFrontend('scanComplete', { assets: [], error: message });
          }
          break;

        case 'deleteAsset':
          try {
            await fetch('/api/delete-asset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: message.path }),
            });
            const res = await fetch('/api/snapshot');
            const snap = await res.json();
            this._postToFrontend('watcherEvent', {
              type: 'indexUpdate',
              assets: snap.assets,
              staticAssets: snap.staticAssets,
              ruleReport: snap.ruleReport,
              healthScore: snap.healthScore,
              referenceCounts: snap.referenceCounts,
            });
          } catch (e) {
            console.error('Delete asset failed:', e);
          }
          break;

        case 'resolveDuplicates':
          try {
            await fetch('/api/resolve-duplicates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                canonicalPath: message.canonicalPath,
                duplicatePaths: message.duplicatePaths,
              }),
            });
            const res = await fetch('/api/snapshot');
            const snap = await res.json();
            this._postToFrontend('watcherEvent', {
              type: 'indexUpdate',
              assets: snap.assets,
              staticAssets: snap.staticAssets,
              ruleReport: snap.ruleReport,
              healthScore: snap.healthScore,
              referenceCounts: snap.referenceCounts,
            });
          } catch (e) {
            console.error('Duplicate resolution failed:', e);
          }
          break;

        case 'executeCleanup':
          try {
            await fetch('/api/execute-cleanup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decisions: message.decisions }),
            });
            const res = await fetch('/api/snapshot');
            const snap = await res.json();
            this._postToFrontend('watcherEvent', {
              type: 'indexUpdate',
              assets: snap.assets,
              staticAssets: snap.staticAssets,
              ruleReport: snap.ruleReport,
              healthScore: snap.healthScore,
              referenceCounts: snap.referenceCounts,
            });
          } catch (e) {
            console.error('Cleanup execution failed:', e);
          }
          break;
      }
      return;
    }

    // Offline mock execution
    switch (message.command) {
      case 'scan':
        this._postToFrontend('scanProgress', {
          message: 'Searching candidate paths...',
          index: 1,
          total: 3,
          assets: [],
        });

        setTimeout(() => {
          this._postToFrontend('scanProgress', {
            message: 'Loading assets...',
            index: 2,
            total: 3,
            assets: this._assetsState.slice(0, 3),
          });
        }, 300);

        setTimeout(() => {
          this._postToFrontend('scanComplete', {
            assets: this._assetsState,
            staticAssets: this._staticAssetsState,
            ruleReport: this._ruleReportState,
            healthScore: this._healthScoreState,
            referenceCounts: this._referenceCountsState,
            durationMs: 82,
            parsedCount: this._assetsState.length,
          });
        }, 600);
        break;

      case 'deleteAsset':
        this._assetsState = this._assetsState.filter((a) => a.path !== message.path);
        this._staticAssetsState = this._staticAssetsState.filter((a) => a.path !== message.path);
        this._referenceCountsState = this._referenceCountsState.filter(
          (item) => item[0] !== message.path
        );
        this._recomputeMockGovernance();
        this._postToFrontend('watcherEvent', {
          type: 'indexUpdate',
          assets: this._assetsState,
          staticAssets: this._staticAssetsState,
          ruleReport: this._ruleReportState,
          healthScore: this._healthScoreState,
          referenceCounts: this._referenceCountsState,
        });
        break;

      case 'resolveDuplicates': {
        const canonicalPath = message.canonicalPath as string;
        const duplicatePaths = message.duplicatePaths as string[];
        // Keep canonical asset, remove other duplicate paths
        this._assetsState = this._assetsState.filter(
          (a) => a.path === canonicalPath || !duplicatePaths.includes(a.path)
        );
        this._referenceCountsState = this._referenceCountsState.filter(
          (item) => item[0] === canonicalPath || !duplicatePaths.includes(item[0])
        );
        this._recomputeMockGovernance();
        this._postToFrontend('watcherEvent', {
          type: 'indexUpdate',
          assets: this._assetsState,
          staticAssets: this._staticAssetsState,
          ruleReport: this._ruleReportState,
          healthScore: this._healthScoreState,
          referenceCounts: this._referenceCountsState,
        });
        break;
      }

      case 'executeCleanup': {
        const decisions = message.decisions as CleanupDecision[];
        const toRemove = decisions
          .filter((d: CleanupDecision) => d.decision === 'remove')
          .map((d: CleanupDecision) => d.path);
        this._assetsState = this._assetsState.filter((a) => !toRemove.includes(a.path));
        this._staticAssetsState = this._staticAssetsState.filter((a) => !toRemove.includes(a.path));
        this._referenceCountsState = this._referenceCountsState.filter(
          (item) => !toRemove.includes(item[0])
        );
        this._recomputeMockGovernance();
        this._postToFrontend('watcherEvent', {
          type: 'indexUpdate',
          assets: this._assetsState,
          staticAssets: this._staticAssetsState,
          ruleReport: this._ruleReportState,
          healthScore: this._healthScoreState,
          referenceCounts: this._referenceCountsState,
        });
        break;
      }

      case 'injectDemo': {
        console.log('[Mock Host] Injecting demo asset...');
        const demoAsset: AnimoriaAsset = {
          path: '/workspace/assets/animations/brand-logo.rive',
          name: 'brand-logo.rive',
          stem: 'brand-logo',
          format: 'rive',
          sizeBytes: 102400,
          mtime: Date.now(),
          status: 'parsed',
          metadata: {
            format: 'rive',
            width: 500,
            height: 500,
            durationSeconds: 0,
            artboards: ['BrandLogoBoard'],
            stateMachines: ['BrandAnimationController'],
            animations: ['spin', 'glow', 'pulse'],
          },
        };
        this._assetsState.push(demoAsset);
        this._referenceCountsState.push([demoAsset.path, 3]);
        this._recomputeMockGovernance();
        this._postToFrontend('watcherEvent', {
          type: 'indexUpdate',
          assets: this._assetsState,
          staticAssets: this._staticAssetsState,
          ruleReport: this._ruleReportState,
          healthScore: this._healthScoreState,
          referenceCounts: this._referenceCountsState,
        });
        break;
      }
    }
  }

  private _recomputeMockGovernance() {
    // Dynamically filter diagnostics and recalculate health score based on active assets
    const activePaths = new Set(this._assetsState.map((a) => a.path));
    const activeDiags = MOCK_RULE_REPORT.diagnostics.filter((d) => activePaths.has(d.asset.path));

    this._ruleReportState = {
      ...MOCK_RULE_REPORT,
      diagnostics: activeDiags,
    };

    const activeRecommendations = [];
    let score = 100;

    const hasDuplicates = activeDiags.some((d) => d.ruleId === 'no-duplicate-content');
    const hasOversized = activeDiags.some((d) => d.ruleId === 'max-file-size-kb');
    const hasGif = activeDiags.some((d) => d.ruleId === 'no-gif');

    if (hasDuplicates) {
      activeRecommendations.push({
        ruleId: 'no-duplicate-content',
        potentialScoreRecovery: 15,
        message: 'Duplicate animation assets exist',
      });
      score -= 15;
    }
    if (hasOversized) {
      activeRecommendations.push({
        ruleId: 'max-file-size-kb',
        potentialScoreRecovery: 8,
        message: 'Asset files exceed size limits',
      });
      score -= 8;
    }
    if (hasGif) {
      activeRecommendations.push({
        ruleId: 'no-gif',
        potentialScoreRecovery: 5,
        message: 'Discouraged GIF formats used',
      });
      score -= 5;
    }

    this._healthScoreState = {
      score,
      totalAssetCount: this._assetsState.length,
      totalDiagnosticCount: activeDiags.length,
      categories: [],
      recommendations: activeRecommendations,
      generatedAt: new Date().toISOString(),
      durationMs: 1,
    };
  }
}

export const mockExtensionHost = new MockExtensionHost();
