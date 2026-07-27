import 'iconify-icon';
import { addCollection, type IconifyJSON } from 'iconify-icon';
import mingcuteData from '@iconify-json/mingcute/icons.json';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Pre-load official MingCute icon set into iconify-icon registry locally
try {
  addCollection(mingcuteData as IconifyJSON);
} catch (e) {
  // Ignored if already registered
}

const ICON_ALIAS_MAP: Record<string, string> = {
  folder: 'folder-line',
  'folder-line': 'folder-line',
  'file-code': 'file-code-line',
  'file-code-line': 'file-code-line',
  'file-image': 'pic-line',
  'file-image-line': 'pic-line',
  image: 'pic-line',
  pic: 'pic-line',
  'file-line': 'file-line',
  'shield-check': 'safe-shield-line',
  'shield-check-line': 'safe-shield-line',
  terminal: 'terminal-box-line',
  'terminal-line': 'terminal-box-line',
  play: 'play-fill',
  'play-fill': 'play-fill',
  pause: 'pause-fill',
  'pause-fill': 'pause-fill',
  refresh: 'refresh-1-line',
  'refresh-line': 'refresh-1-line',
  trash: 'delete-2-line',
  'trash-line': 'delete-2-line',
  search: 'search-line',
  chevron: 'right-line',
  down: 'down-line',
  close: 'close-line',
  settings: 'settings-1-line',
  'settings-line': 'settings-1-line',
  warning: 'warning-line',
  bug: 'bug-line',
  layers: 'layers-line',
  copy: 'copy-line',
};

@customElement('mingcute-icon')
export class MingCuteIcon extends LitElement {
  @property({ type: String }) name = 'folder';
  @property({ type: Number }) size = 14;
  @property({ type: String }) color = 'currentColor';

  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
    }

    iconify-icon {
      display: inline-block;
      line-height: 1;
    }
  `;

  override render() {
    const mapped = ICON_ALIAS_MAP[this.name] || this.name;
    const iconName = mapped.startsWith('mingcute:') ? mapped : `mingcute:${mapped}`;
    return html`
      <iconify-icon
        icon="${iconName}"
        style="font-size: ${this.size}px; color: ${this.color}; width: ${this.size}px; height: ${this.size}px;"
      ></iconify-icon>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mingcute-icon': MingCuteIcon;
  }
}
