import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('animoria-thumbnail-fallback')
export class AnimoriaThumbnailFallback extends LitElement {
  @property({ type: String }) name = '';
  @property({ type: String }) format = '';

  static styles = css`
    :host {
      display: block;
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition:
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        border-color 0.2s ease;
    }

    :host(:hover) {
      transform: scale(1.05);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .canvas {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Onda vectorial que oscila en hover */
    .motion-path {
      fill: none;
      stroke: rgba(255, 255, 255, 0.9);
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 40;
      stroke-dashoffset: 40;
      transition: stroke-dashoffset 0.4s ease;
    }

    :host(:hover) .motion-path {
      stroke-dashoffset: 0;
      animation: waveOscillate 1.6s infinite ease-in-out;
    }

    @keyframes waveOscillate {
      0%,
      100% {
        transform: translateY(0) scaleY(1);
      }
      50% {
        transform: translateY(-1.5px) scaleY(0.8);
      }
    }

    /* Playhead central estático */
    .playhead {
      fill: #ffffff;
      transition: transform 0.2s ease;
    }

    :host(:hover) .playhead {
      transform: scale(1.2);
    }

    .format-badge {
      position: absolute;
      bottom: 2px;
      right: 2px;
      font-size: 8px;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.55);
      color: rgba(255, 255, 255, 0.95);
      padding: 1px 3px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
    }
  `;

  /**
   * Genera un degradado lineal estético y determinista a partir del nombre del archivo.
   */
  private _getDeterministicGradient(name: string): string {
    if (!name) {
      return 'linear-gradient(135deg, #4f46e5, #06b6d4)';
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Usar valores absolutos de tono en base HSL
    const hueA = Math.abs(hash) % 360;
    // Desfase armónico estable de 40 grados
    const hueB = (hueA + 40) % 360;

    // Saturation al 65% y Lightness al 45% aseguran colores vibrantes pero legibles y de contraste robusto
    return `linear-gradient(135deg, hsl(${hueA}, 65%, 45%), hsl(${hueB}, 60%, 35%))`;
  }

  render() {
    const gradient = this._getDeterministicGradient(this.name);
    const shortFormat = this.format ? this.format.substring(0, 3) : 'LOTT';

    return html`
      <div class="canvas" style="background: ${gradient};">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <!-- Onda del timeline -->
          <path class="motion-path" d="M2 12 C 5 6, 8 18, 12 12 C 16 6, 19 18, 22 12" />
          <!-- Playhead central indicando control temporal -->
          <circle class="playhead" cx="12" cy="12" r="2" />
        </svg>
        <span class="format-badge">${shortFormat}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-thumbnail-fallback': AnimoriaThumbnailFallback;
  }
}
