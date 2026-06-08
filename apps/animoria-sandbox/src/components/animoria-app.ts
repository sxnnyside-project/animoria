import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import './animoria-gallery.js';

const MOCK_ASSETS: AnimoriaAsset[] = [
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
      layerCount: 1,
      markers: [],
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
      width: 512,
      height: 512,
      layerCount: 1,
      markers: [],
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
      fps: 30,
      durationSeconds: 4,
      totalFrames: 120,
      width: 512,
      height: 512,
      layerCount: 1,
      markers: [],
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
    error: 'Validation failed',
  },
];

@customElement('animoria-app')
export class AnimoriaApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
    }

    animoria-gallery {
      flex: 1;
      min-height: 0;
    }
  `;

  render() {
    return html`
      <animoria-gallery
        .assets=${MOCK_ASSETS}
        .loading=${false}
        workspacePath="/workspace"
      ></animoria-gallery>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-app': AnimoriaApp;
  }
}
