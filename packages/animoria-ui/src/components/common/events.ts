import { LitElement } from 'lit';

/**
 * Common event dispatching helpers for Lit web components.
 * Ensures consistent bubbling, composing, and typing across the shadow boundary.
 */

/**
 * Dispatches a CustomEvent configured for traversing Shadow DOM boundaries
 * (`bubbles: true`, `composed: true`).
 */
export function emitCustomEvent<T = void>(
  target: EventTarget,
  type: string,
  detail?: T,
  options?: Omit<CustomEventInit<T>, 'detail'>,
): boolean {
  return target.dispatchEvent(
    new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail,
      ...options,
    }),
  );
}

/**
 * Base Lit element class providing typed shadow-boundary event dispatching.
 */
export class AnimoriaElement extends LitElement {
  /**
   * Dispatches a bubbling, composed CustomEvent crossing Shadow DOM boundaries.
   */
  protected emit<T = void>(
    type: string,
    detail?: T,
    options?: Omit<CustomEventInit<T>, 'detail'>,
  ): boolean {
    return emitCustomEvent(this, type, detail, options);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: TypeScript TS2545 constructor rest parameter requirement
export type LitConstructor<T = LitElement> = new (...args: any[]) => T;

/**
 * Mixin that adds a standard `emit<T>(type, detail)` method to any LitElement subclass.
 */
export function WithEvents<TBase extends LitConstructor>(Base: TBase) {
  class WithEventsElement extends Base {
    // biome-ignore lint/suspicious/noExplicitAny: TypeScript TS2545 constructor rest parameter requirement
    constructor(...args: any[]) {
      super(...args);
    }

    protected emit<T = void>(
      type: string,
      detail?: T,
      options?: Omit<CustomEventInit<T>, 'detail'>,
    ): boolean {
      return emitCustomEvent(this, type, detail, options);
    }
  }
  return WithEventsElement;
}
