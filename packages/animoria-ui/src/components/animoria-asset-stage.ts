import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { AnimationPreview, UiPreferences } from '../bridge/types.js';

/**
 * The slice of `lottie-web`'s `AnimationItem` this component drives.
 *
 * Named locally rather than imported as a type, so `lottie-web` stays a *runtime*
 * dynamic import with no static edge into the base bundle. Importing its types
 * statically is harmless at runtime and easy to turn into a value import by accident.
 */
interface LottieInstance {
  readonly currentFrame: number;
  readonly totalFrames: number;
  play(): void;
  pause(): void;
  setSpeed(speed: number): void;
  goToAndStop(value: number, isFrame: boolean): void;
  destroy(): void;
}

/**
 * The preview stage: an actual player, not a picture of one.
 *
 * ## What this restores
 * `AnimoriaPreviewPanel` was the heart of the product, and the shared-UI migration
 * replaced it with a still frame in an `<img>`. Everything that made it worth using
 * — playback, a frame scrubber, speed, a background you could change to see a white
 * asset, zoom — went with it. The contract even carried `data: unknown`, which no host
 * ever filled, so the "preview" was a thumbnail with a caption explaining that
 * playback happens elsewhere.
 *
 * This is that capability rebuilt on the current architecture: Core reads the
 * document, the host puts it on the wire as a typed `AnimationPreview`, and this
 * component plays it. It decides nothing about the asset — frame count and frame rate
 * arrive with the payload — and it calls no host API.
 *
 * ## Why `lottie-web` is imported dynamically
 * `import()` defers constructing the player until a Lottie is actually opened, so a
 * developer who only ever looks at the tree never pays for it at startup.
 *
 * It does **not** currently keep it out of the bundle: the hosts load a single IIFE
 * file, which cannot code-split, so the player is inlined and the bundle is ~430 kB
 * rather than ~115 kB. That is a deliberate trade — the file is read from disk inside
 * an already-running IDE, not fetched over a network, and the alternative on offer was
 * a preview that could not play. Recording it plainly because a comment claiming a
 * lazy chunk that does not exist is how the last set of false architectural claims
 * survived three waves.
 *
 * ## Why the states are explicit
 * `idle`, `loading`, `playing`, `still`, `unsupported` and `failed` are six different
 * things to tell a developer. The migration's inspector had two, and a Rive file that
 * cannot animate here looked exactly like one whose frame failed to render.
 */
@customElement('animoria-asset-stage')
export class AnimoriaAssetStage extends LitElement {
  @property({ attribute: false }) preview: AnimationPreview | null = null;
  @property({ attribute: false }) preferences!: UiPreferences;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';
  /** Identifies the asset the current preview belongs to, so a change resets state. */
  @property({ type: String }) assetPath = '';

  @state() private _playing = true;
  @state() private _frame = 0;
  @state() private _totalFrames = 0;
  @state() private _zoom = 1;
  /** Set when the player itself fails — distinct from a host-reported error. */
  @state() private _playerError = '';

  @query('.lottie-mount') private _mount!: HTMLDivElement | null;

  /** The `lottie-web` instance, kept untyped so the player stays a lazy import. */
  private _animation: LottieInstance | null = null;
  private _frameTimer: number | undefined;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-2);
    }

    .stage {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      max-height: 340px;
      overflow: hidden;
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
    }

    /*
     * The checkerboard, which is not decoration.
     *
     * A transparent asset on a solid background is indistinguishable from an opaque
     * one, and "is this transparent?" is a question a developer opens a preview to
     * answer. Rendered here rather than as an image so it costs nothing.
     */
    .stage.checkered {
      background-color: #1b1c20;
      background-image:
        linear-gradient(45deg, #26272c 25%, transparent 25%),
        linear-gradient(-45deg, #26272c 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #26272c 75%),
        linear-gradient(-45deg, transparent 75%, #26272c 75%);
      background-size: 16px 16px;
      background-position:
        0 0,
        0 8px,
        8px -8px,
        -8px 0;
    }

    .surface {
      transform-origin: center;
      max-width: 100%;
      max-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .surface img {
      max-width: 100%;
      max-height: 320px;
      display: block;
    }

    .lottie-mount {
      width: 280px;
      height: 280px;
    }

    .note {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      line-height: var(--animoria-line-height);
      text-align: center;
      max-width: 44ch;
      padding: var(--animoria-space-3);
    }

    .note.failed {
      color: var(--animoria-danger);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
      flex-wrap: wrap;
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
    }

    .controls button {
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 3px 9px;
      cursor: pointer;
      min-width: 4.5em;
    }

    .controls button:hover {
      background: var(--animoria-bg-hover);
    }

    .scrubber {
      flex: 1;
      min-width: 120px;
      accent-color: var(--animoria-accent);
    }

    .frame-readout {
      font-family: var(--animoria-font-mono);
      min-width: 9ch;
      text-align: right;
    }

    select {
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      border-radius: var(--animoria-radius-sm);
      color: var(--animoria-text-primary);
      font-family: inherit;
      font-size: var(--animoria-font-size-xs);
      padding: 2px 4px;
    }
  `;

  override disconnectedCallback(): void {
    this._teardown();
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('preview') || changed.has('assetPath')) {
      this._teardown();
      void this._mountPlayer();
    }
    if (changed.has('preferences')) this._applySpeed();
  }

  private _teardown(): void {
    if (this._frameTimer !== undefined) {
      clearInterval(this._frameTimer);
      this._frameTimer = undefined;
    }
    // Destroyed, not dropped. `lottie-web` holds a requestAnimationFrame loop and a
    // resize listener per instance; leaking one per asset click is how a panel that
    // felt fine at first becomes unusable after ten minutes of browsing.
    this._animation?.destroy();
    this._animation = null;
    this._playerError = '';
    this._frame = 0;
  }

  private async _mountPlayer(): Promise<void> {
    const preview = this.preview;
    if (!preview || preview.kind !== 'lottie') return;

    // The element exists only after this render, so wait for it rather than
    // querying a mount point that is not there yet.
    await this.updateComplete;
    const mount = this._mount;
    if (!mount) return;

    try {
      const lottie = (await import('lottie-web')).default;
      const animation = lottie.loadAnimation({
        container: mount,
        renderer: 'svg',
        loop: true,
        autoplay: this._playing,
        animationData: preview.animation as Record<string, unknown>,
      });

      this._animation = animation as unknown as LottieInstance;
      this._totalFrames = preview.totalFrames || Math.round(animation.totalFrames) || 0;
      this._applySpeed();

      // Polled rather than driven by `enterFrame`: that event fires once per rendered
      // frame, and re-rendering a Lit component at 60 Hz to move a scrubber costs more
      // than the scrubber is worth. Ten updates a second reads as continuous.
      this._frameTimer = window.setInterval(() => {
        if (!this._animation) return;
        this._frame = Math.round(this._animation.currentFrame);
      }, 100);
    } catch (error) {
      // A player that fails to load is a real state with a real cause, and the
      // developer is entitled to both rather than to an empty rectangle.
      this._playerError =
        error instanceof Error
          ? `The Lottie player could not start: ${error.message}`
          : 'The Lottie player could not start.';
    }
  }

  private _applySpeed(): void {
    this._animation?.setSpeed(this.preferences?.playbackSpeed ?? 1);
  }

  private _togglePlay(): void {
    this._playing = !this._playing;
    if (this._playing) this._animation?.play();
    else this._animation?.pause();
  }

  private _scrub(frame: number): void {
    this._playing = false;
    this._frame = frame;
    this._animation?.goToAndStop(frame, true);
  }

  private _emitPreferences(patch: Partial<UiPreferences>): void {
    this.dispatchEvent(
      new CustomEvent('preferences-change', {
        detail: { preferences: { ...this.preferences, ...patch } },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderSurface() {
    const preview = this.preview;

    if (this.error) return html`<span class="note failed" role="alert">${this.error}</span>`;
    if (this._playerError) {
      return html`<span class="note failed" role="alert">${this._playerError}</span>`;
    }
    if (this.loading) return html`<span class="note" role="status">Loading the preview…</span>`;
    if (!preview) return html`<span class="note">Select an asset to preview it.</span>`;

    if (preview.kind === 'unsupported') {
      return html`<span class="note">${preview.reason}</span>`;
    }

    const scale = `transform: scale(${this._zoom})`;

    if (preview.kind === 'lottie') {
      return html`<div class="surface" style=${scale}><div class="lottie-mount"></div></div>`;
    }

    if (preview.kind === 'still') {
      return html`
        <div class="surface" style=${scale}>
          <img src=${preview.source} alt="Rendered frame" />
        </div>
      `;
    }

    return html`
      <div class="surface" style=${scale}><img src=${preview.source} alt="Preview" /></div>
    `;
  }

  private _renderControls() {
    const preview = this.preview;
    const isLottie = preview?.kind === 'lottie';
    const canScrub = isLottie && this._totalFrames > 0;

    return html`
      <div class="controls">
        ${
          isLottie
            ? html`
                <button type="button" @click=${() => this._togglePlay()}>
                  ${this._playing ? 'Pause' : 'Play'}
                </button>
                <input
                  class="scrubber"
                  type="range"
                  min="0"
                  max=${Math.max(0, this._totalFrames - 1)}
                  .value=${String(this._frame)}
                  ?disabled=${!canScrub}
                  aria-label="Frame"
                  @input=${(event: Event) =>
                    this._scrub(Number((event.target as HTMLInputElement).value))}
                />
                <span class="frame-readout">${this._frame}/${this._totalFrames}</span>
              `
            : nothing
        }

        <label>
          Speed
          <select
            .value=${String(this.preferences?.playbackSpeed ?? 1)}
            @change=${(event: Event) =>
              this._emitPreferences({
                playbackSpeed: Number((event.target as HTMLSelectElement).value),
              })}
          >
            <option value="0.25">0.25×</option>
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
        </label>

        <label>
          Zoom
          <select
            .value=${String(this._zoom)}
            @change=${(event: Event) => {
              this._zoom = Number((event.target as HTMLSelectElement).value);
            }}
          >
            <option value="0.5">50%</option>
            <option value="1">100%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
          </select>
        </label>

        <label>
          Background
          <select
            .value=${this.preferences?.previewBackground ?? 'transparent'}
            @change=${(event: Event) =>
              this._emitPreferences({
                previewBackground: (event.target as HTMLSelectElement).value,
              })}
          >
            <option value="transparent">Checkerboard</option>
            <option value="#ffffff">White</option>
            <option value="#000000">Black</option>
            <option value="var(--animoria-bg-secondary)">Editor</option>
          </select>
        </label>
      </div>
    `;
  }

  override render() {
    const background = this.preferences?.previewBackground ?? 'transparent';
    const checkered = background === 'transparent';

    return html`
      <div
        class="stage ${checkered ? 'checkered' : ''}"
        style=${checkered ? '' : `background:${background}`}
      >
        ${this._renderSurface()}
      </div>
      ${this.preview && !this.loading && !this.error ? this._renderControls() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-asset-stage': AnimoriaAssetStage;
  }
}
