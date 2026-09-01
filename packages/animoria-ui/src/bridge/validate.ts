import type { HostInbound, HostOutbound } from './types.js';
import { INBOUND_TYPES, OUTBOUND_TYPES } from './types.js';

/**
 * Runtime validation for bidirectional bridge messages across host boundaries.
 * Enforces schema conformance for `HostInbound` and `HostOutbound` payloads at runtime.
 */

export type ValidationResult<T> =
  | { readonly ok: true; readonly message: T }
  | { readonly ok: false; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
}

/** Field requirements per outbound type. `true` means "present and of this kind". */
const OUTBOUND_SHAPE: Readonly<
  Record<HostOutbound['type'], readonly [field: string, check: (v: unknown) => boolean][]>
> = {
  ready: [],
  'run-analysis': [],
  'open-asset': [
    ['assetPath', isString],
    ['rootId', isString],
  ],
  'reveal-asset': [
    ['assetPath', isString],
    ['rootId', isString],
  ],
  'open-reference': [
    ['file', isString],
    ['line', isFiniteNumber],
    ['rootId', isString],
  ],
  'request-thumbnail': [['assetPath', isString]],
  'request-animation-data': [['assetPath', isString]],
  'copy-to-clipboard': [
    ['text', isString],
    ['label', isString],
  ],
  'generate-snippet': [['assetPath', isString]],
  'save-preferences': [['preferences', isRecord]],
  'request-usage-references': [['assetPath', isString]],
  'dismiss-cleanup-candidate': [
    ['assetPath', isString],
    ['dismissed', isBoolean],
  ],
  'request-cleanup-proposal': [],
  'request-cleanup-plan': [['assetPaths', isStringArray]],
  'apply-cleanup-plan': [
    ['planId', isString],
    ['allowPartial', isBoolean],
  ],
  'request-resolution-plan': [
    ['groupId', isString],
    ['keepPath', isString],
  ],
  'apply-resolution-plan': [
    ['planId', isString],
    ['allowPartial', isBoolean],
  ],
  'request-trash-sessions': [],
  'restore-session': [['sessionId', isString]],
};

/** Field requirements per inbound type. */
const INBOUND_SHAPE: Readonly<
  Record<HostInbound['type'], readonly [field: string, check: (v: unknown) => boolean][]>
> = {
  capabilities: [['capabilities', isRecord]],
  preferences: [['preferences', isRecord]],
  'usage-references': [
    ['assetPath', isString],
    ['references', Array.isArray],
    ['complete', isBoolean],
  ],
  focus: [
    ['tab', isString],
    ['assetPath', (v) => v === null || isString(v)],
    ['groupId', (v) => v === null || isString(v)],
    ['rootId', isString],
  ],
  analysis: [['analysis', isRecord]],
  'roots-changed': [['roots', Array.isArray]],
  'analysis-progress': [
    ['readiness', isRecord],
    ['message', isString],
  ],
  thumbnail: [
    ['assetPath', isString],
    ['source', (v) => v === null || isString(v)],
  ],
  'animation-data': [
    ['assetPath', isString],
    ['preview', (v) => v === null || (isRecord(v) && isString(v.kind))],
    ['error', (v) => v === null || isString(v)],
  ],
  'cleanup-proposal': [['roots', Array.isArray]],
  'cleanup-plan': [['plans', Array.isArray]],
  'cleanup-result': [['result', isRecord]],
  'resolution-plan': [
    ['planId', isString],
    ['rootId', isString],
    ['plan', isRecord],
  ],
  'resolution-result': [['status', isString]],
  'trash-sessions': [['sessions', Array.isArray]],
  'restore-result': [['result', isRecord]],
  snippets: [
    ['assetPath', isString],
    ['snippets', Array.isArray],
  ],
  error: [
    ['message', isString],
    ['recoverable', isBoolean],
  ],
};

function validate<T>(
  raw: unknown,
  known: readonly string[],
  shape: Readonly<Record<string, readonly [string, (v: unknown) => boolean][]>>,
  direction: string
): ValidationResult<T> {
  if (!isRecord(raw)) return { ok: false, reason: `${direction} message is not an object` };
  if (!isString(raw.type)) {
    return { ok: false, reason: `${direction} message.type is missing or not a string` };
  }
  if (!known.includes(raw.type)) {
    return { ok: false, reason: `unrecognized ${direction} message type "${raw.type}"` };
  }

  for (const [field, check] of shape[raw.type] ?? []) {
    if (!check(raw[field])) {
      return { ok: false, reason: `"${raw.type}" requires a valid "${field}"` };
    }
  }

  return { ok: true, message: raw as T };
}

/** Validates a message arriving from the UI, on the host side. */
export function validateOutbound(raw: unknown): ValidationResult<HostOutbound> {
  return validate<HostOutbound>(raw, OUTBOUND_TYPES, OUTBOUND_SHAPE, 'outbound');
}

/** Validates a message arriving from the host, on the UI side. */
export function validateInbound(raw: unknown): ValidationResult<HostInbound> {
  return validate<HostInbound>(raw, INBOUND_TYPES, INBOUND_SHAPE, 'inbound');
}
