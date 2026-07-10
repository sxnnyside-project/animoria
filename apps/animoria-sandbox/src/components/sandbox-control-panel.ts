import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AnimoriaAsset } from '@animoria/core';
import { t } from '@animoria/core/i18n';

@customElement('sandbox-control-panel')
export class SandboxControlPanel extends LitElement {
  @property({ type: String }) locale = 'en';
  @state() private _currentTheme = 'theme-sandbox-standalone';

  static styles = css`
    :host {
      display: block;
      width: 280px;
      background: var(--animoria-bg-secondary);
      border-left: 1px solid var(--animoria-border-color);
      padding: 20px;
      box-sizing: border-box;
      font-family: var(--animoria-font-family);
      color: var(--animoria-text-primary);
      overflow-y: auto;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--animoria-accent);
      border-bottom: 1px solid var(--animoria-border-color);
      padding-bottom: 8px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--animoria-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .theme-info {
      font-size: 11px;
      color: var(--animoria-text-muted);
      margin-bottom: 12px;
    }

    .btn {
      display: block;
      width: 100%;
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-align: left;
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    }

    .btn:hover {
      background: var(--animoria-hover-bg);
      border-color: var(--animoria-accent);
    }

    .btn.active {
      border-color: var(--animoria-accent);
      background: rgba(99, 102, 241, 0.1);
    }

    .btn-watcher {
      background: rgba(99, 102, 241, 0.05);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .btn-watcher:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--animoria-accent);
    }

    .lang-selector select {
      width: 100%;
      background: var(--animoria-bg-primary);
      border: 1px solid var(--animoria-border-color);
      color: var(--animoria-text-primary);
      padding: 6px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      outline: none;
    }

    .lang-selector select:focus {
      border-color: var(--animoria-accent);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._setTheme(this._currentTheme);
  }

  t(key: string): string {
    return t(key, this.locale);
  }

  private _setTheme(theme: string) {
    this._currentTheme = theme;
    document.body.className = '';
    document.body.classList.add(theme);
  }

  private _onLangChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('change-locale', {
        detail: { locale: select.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _emitWatcherEvent(type: 'added' | 'modified' | 'removed', asset: AnimoriaAsset) {
    window.postMessage(
      {
        command: 'watcherEvent',
        type,
        asset,
      },
      '*'
    );
  }

  private _simulateAddRive() {
    const asset: AnimoriaAsset = {
      path: '/workspace/assets/animations/hero.rive',
      name: 'hero.rive',
      stem: 'hero',
      format: 'rive',
      sizeBytes: 94800,
      mtime: Date.now(),
      status: 'parsed',
      metadata: {
        format: 'rive',
        width: 1024,
        height: 768,
        durationSeconds: 12.5,
        artboards: ['hero-header', 'compact-view'],
        stateMachines: ['StateMachineMain'],
        animations: ['intro_reveal', 'hover_pulse', 'outro_collapse'],
      },
    };
    this._emitWatcherEvent('added', asset);
  }

  private _simulateAddGif() {
    const asset: AnimoriaAsset = {
      path: '/workspace/assets/animations/loading-spinner.gif',
      name: 'loading-spinner.gif',
      stem: 'loading-spinner',
      format: 'gif',
      sizeBytes: 43200,
      mtime: Date.now(),
      status: 'parsed',
      metadata: {
        format: 'gif',
        width: 64,
        height: 64,
        durationSeconds: 0.8,
        frameCount: 24,
        loopCount: 0,
      },
    };
    this._emitWatcherEvent('added', asset);
  }

  private _simulateModifyAsset() {
    const asset: AnimoriaAsset = {
      path: '/workspace/assets/animations/success.json',
      name: 'success.json',
      stem: 'success',
      format: 'lottie',
      sizeBytes: 4200,
      mtime: Date.now(),
      status: 'parsed',
      metadata: {
        format: 'lottie',
        fps: 60,
        durationSeconds: 1.5,
        totalFrames: 90,
        width: 512,
        height: 512,
        layerCount: 12,
      },
    };
    this._emitWatcherEvent('modified', asset);
  }

  private _simulateRemoveAsset() {
    const asset: AnimoriaAsset = {
      path: '/workspace/assets/animations/loading.json',
      name: 'loading.json',
      stem: 'loading',
      format: 'lottie',
      sizeBytes: 3800,
      mtime: Date.now(),
      status: 'parsed',
    };
    this._emitWatcherEvent('removed', asset);
  }

  render() {
    return html`
      <h3>${this.t('control.title')}</h3>

      <div class="section-title">${this.t('control.language')}</div>
      <div class="lang-selector">
        <select @change="${this._onLangChange}" .value="${this.locale}">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ja">日本語</option>
          <option value="fr">Français</option>
          <option value="zh-CN">简体中文</option>
        </select>
      </div>

      <div class="section-title">${this.t('control.hybridThemes')}</div>
      <div class="theme-info">
        ${this.t('control.activeTheme')}<strong>${this._currentTheme}</strong>
      </div>

      <button
        class="btn ${this._currentTheme === 'theme-sandbox-standalone' ? 'active' : ''}"
        @click="${() => this._setTheme('theme-sandbox-standalone')}"
      >
        ${this.t('control.themeStandalone')}
      </button>
      <button
        class="btn ${this._currentTheme === 'theme-intellij-dark' ? 'active' : ''}"
        @click="${() => this._setTheme('theme-intellij-dark')}"
      >
        ${this.t('control.themeDarcula')}
      </button>
      <button
        class="btn ${this._currentTheme === 'theme-intellij-light' ? 'active' : ''}"
        @click="${() => this._setTheme('theme-intellij-light')}"
      >
        ${this.t('control.themeLight')}
      </button>

      <div class="section-title">${this.t('control.watcherSimulator')}</div>

      <button class="btn btn-watcher" @click="${this._simulateAddRive}">
        ${this.t('control.addRive')}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateAddGif}">
        ${this.t('control.addGif')}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateModifyAsset}">
        ${this.t('control.modifyAsset')}
      </button>
      <button class="btn btn-watcher" @click="${this._simulateRemoveAsset}">
        ${this.t('control.removeAsset')}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sandbox-control-panel': SandboxControlPanel;
  }
}
