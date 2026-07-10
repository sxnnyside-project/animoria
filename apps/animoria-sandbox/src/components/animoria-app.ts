import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';
import './animoria-gallery.js';
import './sandbox-control-panel.js';
import './animoria-preview-panel.js';
import '../mocks/mock-extension-host.js';

@customElement('animoria-app')
export class AnimoriaApp extends LitElement {
  @state() private _assets: AnimoriaAsset[] = [];
  @state() private _loading = false;
  @state() private _progressMessage = '';
  @state() private _progressPercent = 0;
  @state() private _selectedAsset: AnimoriaAsset | null = null;
  @state() private _locale = 'en';

  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      height: 100vh;
      width: 100%;
      overflow: hidden;
      background: var(--animoria-bg-primary);
    }

    animoria-gallery {
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    animoria-preview-panel {
      flex-shrink: 0;
    }

    sandbox-control-panel {
      flex-shrink: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._handleMessage);
    this._triggerScan();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._handleMessage);
  }

  t(key: string): string {
    return t(key, this._locale);
  }

  private _triggerScan() {
    this._loading = true;
    this._progressMessage = this.t('app.scanningStart');
    this._progressPercent = 0;
    this._selectedAsset = null;
    window.postMessage({ command: 'scan', target: 'extension' }, '*');
  }

  private _onSelectAsset(e: CustomEvent<{ asset: AnimoriaAsset }>) {
    this._selectedAsset = e.detail.asset;
  }

  private _onChangeLocale(e: CustomEvent<{ locale: string }>) {
    this._locale = e.detail.locale;
    // Re-trigger scanning start translation if still loading
    if (
      this._loading &&
      this._progressMessage === t('app.scanningStart', this._locale === 'en' ? 'es' : 'en')
    ) {
      this._progressMessage = this.t('app.scanningStart');
    }
  }

  private _handleMessage = (e: MessageEvent) => {
    const message = e.data;
    if (!message || !message.command) return;

    switch (message.command) {
      case 'scanProgress':
        this._progressMessage = message.message;
        if (message.total > 0) {
          this._progressPercent = Math.round((message.index / message.total) * 100);
        } else {
          this._progressPercent = 0;
        }
        if (message.assets) {
          this._assets = message.assets;
        }
        break;
      case 'scanComplete':
        this._assets = message.assets;
        this._loading = false;
        this._progressMessage = '';
        this._progressPercent = 100;
        break;
      case 'watcherEvent':
        this._handleWatcherEvent(message.type, message.asset);
        break;
      case 'assetDeleted':
        this._assets = this._assets.filter((a) => a.path !== message.path);
        if (this._selectedAsset?.path === message.path) {
          this._selectedAsset = null;
        }
        break;
    }
  };

  private _handleWatcherEvent(type: 'added' | 'modified' | 'removed', asset: AnimoriaAsset) {
    if (type === 'added') {
      if (!this._assets.some((a) => a.path === asset.path)) {
        this._assets = [...this._assets, asset];
      }
    } else if (type === 'modified') {
      this._assets = this._assets.map((a) => (a.path === asset.path ? asset : a));
      if (this._selectedAsset?.path === asset.path) {
        this._selectedAsset = asset;
      }
    } else if (type === 'removed') {
      this._assets = this._assets.filter((a) => a.path !== asset.path);
      if (this._selectedAsset?.path === asset.path) {
        this._selectedAsset = null;
      }
    }
  }

  render() {
    return html`
      <animoria-gallery
        .assets="${this._assets}"
        .loading="${this._loading}"
        .progressMessage="${this._progressMessage}"
        .progressPercent="${this._progressPercent}"
        .locale="${this._locale}"
        workspacePath="/workspace"
        @select-asset="${this._onSelectAsset}"
        @change-locale="${this._onChangeLocale}"
      ></animoria-gallery>
      <animoria-preview-panel
        .asset="${this._selectedAsset}"
        .locale="${this._locale}"
      ></animoria-preview-panel>
      <sandbox-control-panel .locale="${this._locale}"></sandbox-control-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-app': AnimoriaApp;
  }
}
