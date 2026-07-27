import type {
  IntegrationContext,
  IntegrationProvider,
  IntegrationResult,
} from '../IntegrationProvider.js';

/**
 * Integration provider for Vue 3 projects using `vue3-lottie`.
 *
 * ## What this generates
 *
 * A complete Vue 3 Composition API integration:
 * - Component registration import
 * - `<template>` usage with props bound via `v-bind`
 * - `<script setup>` import block
 * - Notes on global vs local registration and Nuxt 3 usage
 *
 * ## Why vue3-lottie
 *
 * `vue3-lottie` is the most widely adopted Lottie wrapper for Vue 3,
 * wrapping `lottie-web` with a first-class Vue 3 Composition API surface.
 * `lottie-vue` and `vue-lottie` target Vue 2 and are excluded.
 *
 * ## Output format
 *
 * The output uses `<script setup>` syntax (Vue 3 SFC standard as of 2022).
 * The `imports` section contains the `<script setup>` block; the `code`
 * section contains the `<template>` block. This lets the UI present them
 * in the correct order with appropriate headers.
 */
export class VueProvider implements IntegrationProvider {
  readonly id = 'vue';
  readonly label = 'Vue 3 (vue3-lottie)';
  readonly supportedFormats = ['lottie', 'dotlottie'] as const;

  generate(context: IntegrationContext): IntegrationResult {
    const { asset, importPath } = context;
    const varName = toPascalCase(asset.stem);

    const imports = [
      '<script setup>',
      `import Vue3Lottie from 'vue3-lottie';`,
      `import ${varName}Data from '${importPath}';`,
      '</script>',
    ].join('\n');

    const code = [
      '<template>',
      '  <Vue3Lottie',
      `    :animationData="${varName}Data"`,
      `    :loop="true"`,
      `    :autoPlay="true"`,
      '  />',
      '</template>',
    ].join('\n');

    const notes = [
      'Global registration (main.ts):',
      `  import Vue3Lottie from 'vue3-lottie';`,
      '  app.use(Vue3Lottie);',
      '',
      'Nuxt 3: add to plugins/ directory or use defineNuxtPlugin.',
    ].join('\n');

    return {
      providerId: this.id,
      label: this.label,
      code,
      imports,
      dependency: 'vue3-lottie',
      installHint: 'npm install vue3-lottie',
      notes,
      language: 'vue',
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converts a file stem to a PascalCase identifier safe for Vue component names. */
function toPascalCase(stem: string): string {
  return stem
    .replace(/[-_.\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9$_]/g, '');
}
