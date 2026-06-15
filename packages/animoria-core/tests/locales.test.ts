import { describe, it, expect } from 'vitest';
import { t } from '../src/i18n/locales.js';

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
});
