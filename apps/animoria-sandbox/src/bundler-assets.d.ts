/**
 * Ambient declarations for the non-JavaScript modules Vite resolves at build time.
 *
 * ## Why this file exists
 * `src/main.ts` does `import '@animoria/ui/tokens.css'` — a side-effect import that
 * Vite turns into a stylesheet injection. TypeScript 5.9 accepted it silently;
 * TypeScript 7 reports `TS2882: Cannot find module or type declarations for
 * side-effect import`, because a side-effect import of something with no declaration
 * is indistinguishable from a typo in a module specifier.
 *
 * The diagnostic is correct, and this is the answer to it rather than a suppression:
 * the module genuinely exists and genuinely has no type surface, so the honest thing
 * to state is that importing it yields nothing. A `@ts-expect-error` would have said
 * "this is broken and I know"; this says "this is a stylesheet".
 *
 * Deliberately not `/// <reference types="vite/client" />`. That would work, but it
 * also pulls in Vite's whole ambient surface — `import.meta.env`, every asset type it
 * knows — none of which this harness uses, and all of which would then typecheck as
 * available.
 */
declare module '*.css' {
  /**
   * No export shape: a stylesheet is imported for its side effect, and any binding
   * taken from it would be a mistake this declaration should not make typeable.
   */
  const stylesheet: never;
  export default stylesheet;
}
