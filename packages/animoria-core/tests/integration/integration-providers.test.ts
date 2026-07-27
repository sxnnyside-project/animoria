import { describe, expect, it } from 'vitest';
import type {
  IntegrationContext,
  IntegrationProvider,
} from '../../src/integration/IntegrationProvider';
import { IntegrationRegistry } from '../../src/integration/IntegrationRegistry';
import { FlutterProvider } from '../../src/integration/providers/FlutterProvider';
import { KotlinProvider } from '../../src/integration/providers/KotlinProvider';
import { ReactProvider } from '../../src/integration/providers/ReactProvider';
import { SwiftProvider } from '../../src/integration/providers/SwiftProvider';
import { VueProvider } from '../../src/integration/providers/VueProvider';
import type { AnimoriaAsset } from '../../src/types/asset';

function makeAsset(overrides: Partial<AnimoriaAsset> = {}): AnimoriaAsset {
  return {
    path: '/workspace/assets/hero.json',
    name: 'hero.json',
    stem: 'hero',
    format: 'lottie',
    sizeBytes: 1024,
    mtime: Date.now(),
    status: 'parsed',
    ...overrides,
  };
}

function makeContext(overrides: Partial<IntegrationContext> = {}): IntegrationContext {
  return {
    asset: makeAsset(),
    importPath: '../assets/hero.json',
    workspaceRelativePath: 'assets/hero.json',
    pathResolutionBasis: 'active-editor',
    workspacePath: '/workspace',
    ...overrides,
  };
}

describe('ReactProvider', () => {
  it('imports using a valid, ./ or ../-prefixed specifier — regression for H-1', () => {
    const result = new ReactProvider().generate(makeContext({ importPath: '../assets/hero.json' }));
    expect(result.imports).toContain(`from '../assets/hero.json'`);
  });

  it('never emits an unprefixed bare specifier', () => {
    // Even if a caller passes a workspace-root path, ReactProvider must not
    // strip or re-derive it — that responsibility belongs to the canonical
    // path helper, not individual providers.
    const result = new ReactProvider().generate(
      makeContext({ importPath: './assets/hero.json', pathResolutionBasis: 'workspace-root' })
    );
    expect(result.imports).toContain(`from './assets/hero.json'`);
  });
});

describe('VueProvider', () => {
  it('imports using importPath verbatim', () => {
    const result = new VueProvider().generate(makeContext({ importPath: '../assets/hero.json' }));
    expect(result.imports).toContain(`from '../assets/hero.json'`);
  });
});

describe('FlutterProvider', () => {
  it('uses workspaceRelativePath directly, never file-relative', () => {
    const result = new FlutterProvider().generate(
      makeContext({
        importPath: '../../assets/animations/hero.json',
        workspaceRelativePath: 'assets/animations/hero.json',
      })
    );
    expect(result.code).toContain(`'assets/animations/hero.json'`);
    expect(result.code).not.toContain('../');
  });
});

describe('SwiftProvider', () => {
  it('references the asset by stem name, not a file-system import path', () => {
    const result = new SwiftProvider().generate(makeContext());
    expect(result.code).toContain('LottieView(animation: .named("hero"))');
    expect(result.code).not.toContain('../');
  });

  it('configures playback and looping via the modern SwiftUI view modifiers', () => {
    const result = new SwiftProvider().generate(makeContext());
    expect(result.code).toContain('.playing()');
    expect(result.code).toContain('.looping()');
  });

  it('surfaces the source file location in notes for manual bundle placement', () => {
    const result = new SwiftProvider().generate(
      makeContext({ workspaceRelativePath: 'assets/animations/hero.json' })
    );
    expect(result.notes ?? '').toContain('assets/animations/hero.json');
  });

  it('supports both lottie and dotlottie formats and notes the minimum version for dotLottie', () => {
    const lottie = new SwiftProvider().generate(makeContext());
    expect(lottie.notes ?? '').not.toContain('dotLottie');

    const dotlottie = new SwiftProvider().generate(
      makeContext({ asset: makeAsset({ format: 'dotlottie', name: 'hero.lottie' }) })
    );
    expect(dotlottie.notes ?? '').toContain('dotLottie');
  });

  it('declares the correct language for syntax highlighting', () => {
    expect(new SwiftProvider().generate(makeContext()).language).toBe('swift');
  });
});

describe('KotlinProvider', () => {
  it('references a lottie asset via a sanitized R.raw resource identifier', () => {
    const result = new KotlinProvider().generate(makeContext());
    expect(result.code).toContain('LottieCompositionSpec.RawRes(R.raw.hero)');
  });

  it('references a dotlottie asset via LottieCompositionSpec.Asset with its filename, not a raw resource', () => {
    const result = new KotlinProvider().generate(
      makeContext({ asset: makeAsset({ format: 'dotlottie', name: 'hero.lottie' }) })
    );
    expect(result.code).toContain('LottieCompositionSpec.Asset("hero.lottie")');
    expect(result.code).not.toContain('R.raw');
  });

  it('sanitizes a stem with hyphens, dots, and mixed case into a valid Android resource name', () => {
    const result = new KotlinProvider().generate(
      makeContext({
        asset: makeAsset({ stem: 'Hero-Animation.v2', name: 'Hero-Animation.v2.json' }),
      })
    );
    expect(result.code).toMatch(/R\.raw\.[a-z][a-z0-9_]*\)/);
    expect(result.code).toContain('R.raw.hero_animation_v2');
  });

  it('prefixes a resource name that would otherwise start with a digit', () => {
    const result = new KotlinProvider().generate(
      makeContext({ asset: makeAsset({ stem: '123hero', name: '123hero.json' }) })
    );
    expect(result.code).toMatch(/R\.raw\.[a-z][a-z0-9_]*\)/);
  });

  it('drives playback through rememberLottieAnimatable with infinite iteration, the modern Compose convention', () => {
    const result = new KotlinProvider().generate(makeContext());
    expect(result.code).toContain('rememberLottieAnimatable');
    expect(result.code).toContain('LottieConstants.IterateForever');
  });

  it('declares the correct language for syntax highlighting', () => {
    expect(new KotlinProvider().generate(makeContext()).language).toBe('kotlin');
  });
});

describe('IntegrationRegistry', () => {
  it('registers Swift and Kotlin as first-class providers — v1.0.0 scope, not stubs', () => {
    const registry = new IntegrationRegistry();
    registry.register(new SwiftProvider());
    registry.register(new KotlinProvider());

    const results = registry.generate(makeContext());
    const providerIds = results.map((r) => r.providerId);

    expect(providerIds).toContain('swift');
    expect(providerIds).toContain('kotlin');
    expect(registry.getStubs().map((s) => s.id)).not.toContain('swift');
    expect(registry.getStubs().map((s) => s.id)).not.toContain('kotlin');
  });

  it('generates output from all five shipped providers with no duplicate ids', () => {
    const registry = new IntegrationRegistry();
    const providers = [
      new ReactProvider(),
      new VueProvider(),
      new FlutterProvider(),
      new SwiftProvider(),
      new KotlinProvider(),
    ];
    for (const provider of providers) {
      expect(() => registry.register(provider)).not.toThrow();
    }

    const results = registry.generate(makeContext());
    const ids = results.map((r) => r.providerId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['react', 'vue', 'flutter', 'swift', 'kotlin']));
  });

  it('appends a path caveat only when pathResolutionBasis is workspace-root', () => {
    const registry = new IntegrationRegistry();
    registry.register(new ReactProvider());

    const withEditor = registry.generate(makeContext({ pathResolutionBasis: 'active-editor' }));
    expect(withEditor[0]!.notes ?? '').not.toContain('workspace root');

    const withoutEditor = registry.generate(makeContext({ pathResolutionBasis: 'workspace-root' }));
    expect(withoutEditor[0]!.notes ?? '').toContain('workspace root');
  });

  it('clear() removes all providers and stubs — supports test isolation on the shared singleton', () => {
    const registry = new IntegrationRegistry();
    registry.register(new ReactProvider());
    registry.registerStub({ id: 'swift', label: 'SwiftUI' });

    registry.clear();

    expect(registry.getProviders('lottie')).toHaveLength(0);
    expect(registry.getStubs()).toHaveLength(0);
    // Re-registering the same id must not throw now that it was cleared.
    expect(() => registry.register(new ReactProvider())).not.toThrow();
  });

  it('a new provider automatically inherits correct path behavior with no extra wiring', () => {
    // Stands in for "future providers automatically inherit correct path
    // behavior" — any IntegrationProvider that reads context.importPath
    // gets a valid specifier and the same caveat treatment, without the
    // registry needing to know anything provider-specific.
    const futureProvider: IntegrationProvider = {
      id: 'future-framework',
      label: 'Future Framework',
      supportedFormats: ['lottie'],
      generate(context) {
        return {
          providerId: this.id,
          label: this.label,
          code: `load('${context.importPath}')`,
          language: 'text',
        };
      },
    };

    const registry = new IntegrationRegistry();
    registry.register(futureProvider);

    const result = registry.generateOne(
      'future-framework',
      makeContext({ importPath: '../assets/hero.json', pathResolutionBasis: 'workspace-root' })
    );

    expect(result?.code).toBe(`load('../assets/hero.json')`);
    expect(result?.notes ?? '').toContain('workspace root');
  });
});
