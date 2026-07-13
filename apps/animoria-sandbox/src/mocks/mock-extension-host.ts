import type { AnimoriaAsset } from '@animoria/core';

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
    sizeBytes: 85200,
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

export class MockExtensionHost {
  constructor() {
    // Only intercept messages if running in the standalone browser sandbox (http/https)
    // Avoid running inside local file-based environments (like JCEF webview jar/file protocol)
    const isSandbox =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'http:' || window.location.protocol === 'https:');
    if (!isSandbox) {
      console.log('[Animoria Host] Running in native IDE environment. Mock host disabled.');
      return;
    }

    // Listen for outgoing messages from the frontend
    window.addEventListener('message', (e) => {
      if (e.data && e.data.target === 'extension') {
        this._handleFrontendMessage(e.data);
      }
    });
  }

  private _postToFrontend(command: string, data: any) {
    window.postMessage(
      {
        command,
        ...data,
      },
      '*'
    );
  }

  private _handleFrontendMessage(message: any) {
    if (!message || !message.command) return;

    console.log(`[Mock Extension Host] Received: ${message.command}`, message);

    switch (message.command) {
      case 'scan':
        this._simulateScan();
        break;
      case 'openPreview':
        console.log(`[Mock Host] Opening preview for: ${message.asset.name}`);
        break;
      case 'deleteAsset':
        console.log(`[Mock Host] Deleting asset: ${message.path}`);
        this._postToFrontend('assetDeleted', { path: message.path });
        break;
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
        this._postToFrontend('watcherEvent', { type: 'added', asset: demoAsset });
        break;
      }
    }
  }

  private _simulateScan() {
    this._postToFrontend('scanProgress', {
      message: 'Starting recursive directory crawler...',
      index: 0,
      total: 3,
      assets: [],
    });

    setTimeout(() => {
      this._postToFrontend('scanProgress', {
        message: 'Searching for "v" and "layers" keys in the first chunk (1KB)...',
        index: 1,
        total: 3,
        assets: MOCK_ASSETS_RICH.slice(0, 2),
      });
    }, 400);

    setTimeout(() => {
      this._postToFrontend('scanProgress', {
        message: 'Generating metadata for asset queue...',
        index: 2,
        total: 3,
        assets: MOCK_ASSETS_RICH.slice(0, 5),
      });
    }, 800);

    setTimeout(() => {
      this._postToFrontend('scanComplete', {
        assets: MOCK_ASSETS_RICH,
        durationMs: 142,
        parsedCount: 6,
      });
    }, 1200);
  }
}
export const mockExtensionHost = new MockExtensionHost();
