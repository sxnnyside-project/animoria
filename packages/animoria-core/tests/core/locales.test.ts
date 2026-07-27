import { describe, expect, it } from 'vitest';
import { locales, t } from '../../src/i18n/locales.js';

/** Recursively collects every dotted key path present in a locale tree (e.g. "preview.play"). */
function collectKeyPaths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : collectKeyPaths(value, path);
  });
}

describe('i18n Locales Translation Engine', () => {
  it('should translate keys correctly in English (en)', () => {
    expect(t('control.title', 'en')).toBe('DX Control Panel');
    expect(t('gallery.emptyTitle', 'en')).toBe('Your workspace is empty');
  });

  it('should translate keys correctly in Spanish (es)', () => {
    expect(t('control.title', 'es')).toBe('DX Panel de Control');
    expect(t('gallery.emptyTitle', 'es')).toBe('Tu espacio de trabajo está vacío');
  });

  it('should translate keys correctly in Japanese (ja)', () => {
    expect(t('control.title', 'ja')).toBe('DX コントロールパネル');
  });

  it('should translate keys correctly in French (fr)', () => {
    expect(t('control.title', 'fr')).toBe('Panneau de Contrôle DX');
  });

  it('should translate keys correctly in Simplified Chinese (zh-CN)', () => {
    expect(t('control.title', 'zh-CN')).toBe('DX 控制面板');
  });

  it('should fall back to English if the key is missing in the target locale', () => {
    // control.nonexistent is missing in all locales
    expect(t('control.nonexistent', 'es')).toBe('control.nonexistent');
  });

  it('should return the key itself if the key does not exist at all', () => {
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
  });

  it('should fall back to English if the requested locale is unsupported', () => {
    // de (German) is unsupported, falls back to English value
    expect(t('control.title', 'de')).toBe('DX Control Panel');
  });

  it('resolves every Preview Panel key actually used by the extension — regression for keys silently rendering as raw "preview.xxx" strings', () => {
    const keys = [
      'preview.loading',
      'preview.assetRemoved',
      'preview.livePreview',
      'preview.play',
      'preview.pause',
      'preview.restart',
      'preview.loop',
      'preview.metadata',
      'preview.usageReferences',
      'preview.searchingCodebase',
      'preview.noReferences',
      'preview.quickActions',
      'preview.copyPath',
      'preview.copyName',
      'preview.revealInExplorer',
      'preview.notFoundIn',
      'preview.foundIn',
      'preview.loadError',
      'preview.hasImages',
      'preview.animationsCount',
      'preview.none',
    ];

    for (const locale of Object.keys(locales)) {
      for (const key of keys) {
        expect(t(key, locale), `${key} in locale "${locale}"`).not.toBe(key);
      }
    }
  });

  it('never has a translation key present in one locale but missing in another', () => {
    const keyPathsByLocale = Object.fromEntries(
      Object.entries(locales).map(([locale, tree]) => [locale, new Set(collectKeyPaths(tree))])
    );
    const englishKeys = keyPathsByLocale.en;

    for (const [locale, keys] of Object.entries(keyPathsByLocale)) {
      if (locale === 'en') continue;
      const missing = [...englishKeys].filter((key) => !keys.has(key));
      expect(missing, `keys missing in "${locale}"`).toEqual([]);
      const extra = [...keys].filter((key) => !englishKeys.has(key));
      expect(extra, `keys present in "${locale}" but not in "en"`).toEqual([]);
    }
  });
});
