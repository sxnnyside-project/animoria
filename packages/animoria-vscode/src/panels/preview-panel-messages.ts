/**
 * Runtime contract for messages the Preview Panel's webview sends to the
 * extension host (`AnimoriaPreviewPanel.webview.postMessage` → host).
 *
 * ## Why this exists
 * The webview's own HTML/JS is entirely authored by this extension, but
 * that does not make the `postMessage` boundary a safe place for
 * unchecked `as` casts: it is still a serialization boundary crossed at
 * runtime, and TypeScript's compile-time types say nothing about what
 * actually arrives there. A cast just asserts the shape without checking
 * it — if a future change to the webview's script and a change to this
 * file's handler ever drift (a typo in a message's payload keys, a
 * renamed field on one side only), an unchecked cast lets that drift
 * become a runtime bug that only surfaces as `undefined` reaching
 * business logic, with no diagnostic trail. Validating explicitly turns
 * that same drift into a safely-ignored, logged message instead.
 *
 * ## How this is organized
 * {@link InboundMessage} is the single source of truth for every message
 * type the host accepts and each one's payload shape.
 * {@link validateInboundMessage} is the only place that shape is checked
 * against a runtime value — `AnimoriaPreviewPanel._handleMessage` never
 * inspects `raw` itself, only the validated, narrowed result.
 *
 * ## Adding a new message type
 * 1. Add the new variant to the {@link InboundMessage} union.
 * 2. Add a case to {@link validateInboundMessage} that validates its
 *    payload (write a small `isXPayload` guard alongside the existing
 *    ones if the payload has fields to check).
 * 3. Handle the new, already-narrowed case in
 *    `AnimoriaPreviewPanel._handleMessage`.
 *
 * No other file needs to change, and no second copy of the validation
 * logic should ever exist — every inbound message, from every call site,
 * passes through {@link validateInboundMessage}.
 */

// ── Message contract ────────────────────────────────────────────────────────

export interface SavePreferencesPayload {
  readonly speed: number;
  readonly bg: string;
  readonly customHex?: string;
}

export interface CopyIntegrationPayload {
  readonly text: string;
  readonly label: string;
}

export interface LoadDotLottieAnimationPayload {
  readonly animationId: string;
}

export interface OpenUsageFilePayload {
  readonly file: string;
  readonly line: number;
}

/** Every message type the Preview Panel's webview may send, with its exact payload shape. */
export type InboundMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'copy-path' }
  | { readonly type: 'copy-stem' }
  | { readonly type: 'reveal-in-explorer' }
  | { readonly type: 'get-integrations' }
  | { readonly type: 'save-preferences'; readonly payload: SavePreferencesPayload }
  | { readonly type: 'copy-integration'; readonly payload: CopyIntegrationPayload }
  | { readonly type: 'load-dotlottie-animation'; readonly payload: LoadDotLottieAnimationPayload }
  | { readonly type: 'open-usage-file'; readonly payload: OpenUsageFilePayload };

/** The outcome of validating a raw inbound value against {@link InboundMessage}. */
export type MessageValidationResult =
  | { readonly ok: true; readonly message: InboundMessage }
  | { readonly ok: false; readonly reason: string };

// ── Primitive guards ─────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ── Payload guards ───────────────────────────────────────────────────────────

function isSavePreferencesPayload(value: unknown): value is SavePreferencesPayload {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.speed) || !isString(value.bg)) return false;
  return value.customHex === undefined || isString(value.customHex);
}

function isCopyIntegrationPayload(value: unknown): value is CopyIntegrationPayload {
  return isRecord(value) && isString(value.text) && isString(value.label);
}

function isLoadDotLottieAnimationPayload(value: unknown): value is LoadDotLottieAnimationPayload {
  return isRecord(value) && isString(value.animationId);
}

function isOpenUsageFilePayload(value: unknown): value is OpenUsageFilePayload {
  return isRecord(value) && isString(value.file) && isFiniteNumber(value.line);
}

// ── Message types that carry no payload ──────────────────────────────────────

const NO_PAYLOAD_TYPES = new Set<InboundMessage['type']>([
  'ready',
  'copy-path',
  'copy-stem',
  'reveal-in-explorer',
  'get-integrations',
]);

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a raw value received from the webview against
 * {@link InboundMessage}. Never throws — every failure mode (not an
 * object, missing `type`, unrecognized `type`, malformed or missing
 * payload, wrong field types) is reported through the returned result,
 * never an exception, so a caller can always safely ignore an invalid
 * message rather than crash the extension host.
 */
export function validateInboundMessage(raw: unknown): MessageValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: 'message is not an object' };
  }
  if (!isString(raw.type)) {
    return { ok: false, reason: 'message.type is missing or not a string' };
  }

  const type = raw.type;

  if (NO_PAYLOAD_TYPES.has(type as InboundMessage['type'])) {
    return { ok: true, message: { type } as InboundMessage };
  }

  switch (type) {
    case 'save-preferences':
      return isSavePreferencesPayload(raw.payload)
        ? { ok: true, message: { type, payload: raw.payload } }
        : {
            ok: false,
            reason:
              'save-preferences payload must be { speed: number, bg: string, customHex?: string }',
          };

    case 'copy-integration':
      return isCopyIntegrationPayload(raw.payload)
        ? { ok: true, message: { type, payload: raw.payload } }
        : { ok: false, reason: 'copy-integration payload must be { text: string, label: string }' };

    case 'load-dotlottie-animation':
      return isLoadDotLottieAnimationPayload(raw.payload)
        ? { ok: true, message: { type, payload: raw.payload } }
        : { ok: false, reason: 'load-dotlottie-animation payload must be { animationId: string }' };

    case 'open-usage-file':
      return isOpenUsageFilePayload(raw.payload)
        ? { ok: true, message: { type, payload: raw.payload } }
        : { ok: false, reason: 'open-usage-file payload must be { file: string, line: number }' };

    default:
      return { ok: false, reason: `unrecognized message type "${type}"` };
  }
}
