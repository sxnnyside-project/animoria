import type { HostBridge, HostInbound, HostOutbound } from './types.js';
import { validateInbound } from './validate.js';

/**
 * The one transport every host uses: `window.postMessage` in, a host-supplied
 * `post` out.
 *
 * ## Why every host, including JetBrains
 * JetBrains previously pushed state with
 * `browser.cefBrowser.executeJavaScript("window.animoriaUpdateData($payload)")` —
 * application state string-interpolated into a JavaScript source line and evaluated.
 * Three consequences, all real:
 *
 * 1. **It is not a message channel.** There is no envelope, no type, no validation,
 *    and no way for the UI to reject a malformed update — the payload simply becomes
 *    a call or a syntax error.
 * 2. **It is an injection surface.** An asset path containing a quote or a
 *    backslash — legal on every filesystem Animoria supports — terminates the
 *    string literal. `buildJsonObject` makes the JSON well-formed; it does nothing
 *    about the JavaScript the JSON is being pasted into.
 * 3. **It is unshareable.** A shared component cannot be driven by a host reaching
 *    into its globals; it can only be driven by messages.
 *
 * `JBCefJSQuery` (UI → host) and `window.postMessage` via a single injected
 * `dispatchEvent` (host → UI) give JetBrains the same boundary VS Code has, with the
 * payload as *data* rather than as source.
 */

/** How a host delivers a message to itself. Supplied per host. */
export type OutboundTransport = (message: HostOutbound) => void;

export interface PostMessageBridgeOptions {
  readonly post: OutboundTransport;
  /** Where inbound messages arrive. Defaults to `window`. */
  readonly source?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  /** Called for every message that fails validation, instead of throwing. */
  readonly onInvalid?: (reason: string, raw: unknown) => void;
}

/**
 * Creates a bridge over `postMessage`.
 *
 * Every inbound message is validated before any listener sees it, so a component
 * never receives a shape the contract does not name — the drift becomes one logged
 * line instead of an `undefined` three call frames later.
 */
export function createPostMessageBridge(options: PostMessageBridgeOptions): HostBridge {
  const source = options.source ?? window;
  const listeners = new Set<(message: HostInbound) => void>();

  const handle = (event: Event): void => {
    const data = (event as MessageEvent).data;
    const result = validateInbound(data);
    if (!result.ok) {
      // Reported, never silently dropped. A host that renames a field or invents a
      // message shape must produce a diagnostic here, because the alternative is the
      // failure mode this bridge exists to remove: the panel simply never updates,
      // and nothing anywhere says why. `onInvalid` overrides the default; it does not
      // enable it.
      if (options.onInvalid) options.onInvalid(result.reason, data);
      else console.error(`[animoria] rejected an inbound message — ${result.reason}`, data);
      return;
    }
    for (const listener of listeners) listener(result.message);
  };

  source.addEventListener('message', handle);

  return {
    send(message) {
      options.post(message);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        // Detached once nothing is listening. The previous check ran immediately
        // after `add`, where the set can never be empty, so the `message` listener
        // outlived every mount — one leaked closure per panel reopen.
        if (listeners.size === 0) source.removeEventListener('message', handle);
      };
    },
  };
}
