import { z } from 'zod';

export const SupportedFormatSchema = z.enum([
  'lottie',
  'dotlottie',
  'rive',
  'gif',
  'apng',
  'animated-svg',
  'svg',
  'png',
  'jpeg',
  'webp',
  'avif',
]);

export const AssetLifecycleStateSchema = z.enum([
  'initializing',
  'analyzing',
  'ready',
  'stale',
  'incomplete',
  'failed',
]);

export const AssetMetadataSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  fps: z.number().optional(),
  duration: z.number().optional(),
  totalFrames: z.number().optional(),
  layerCount: z.number().optional(),
  isAnimated: z.boolean().optional(),
});

export const AnimoriaAssetSchema = z.object({
  id: z.string(),
  path: z.string(),
  relativePath: z.string(),
  name: z.string(),
  stem: z.string(),
  format: SupportedFormatSchema,
  sizeBytes: z.number(),
  mtime: z.number(),
  contentHash: z.string().optional(),
  metadata: AssetMetadataSchema.optional(),
});

export const RuleDiagnosticSchema = z.object({
  ruleId: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  targetAssetPath: z.string(),
});

export const WorkspaceAnalysisSchema = z.object({
  rootId: z.string(),
  rootPath: z.string(),
  state: AssetLifecycleStateSchema,
  assets: z.array(AnimoriaAssetSchema),
  diagnostics: z.array(RuleDiagnosticSchema),
  healthScore: z.number().min(0).max(100),
});

export type AnimoriaConfig = z.infer<typeof WorkspaceAnalysisSchema>;
