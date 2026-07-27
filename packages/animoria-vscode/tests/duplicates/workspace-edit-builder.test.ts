import type {
  AnimoriaAsset,
  DuplicateCandidate,
  DuplicateGroup,
  ResolutionPlan,
} from '@animoria/core';
import { describe, expect, it } from 'vitest';
import { buildWorkspaceEdit } from '../../src/duplicates/workspace-edit-builder.js';

/**
 * `buildWorkspaceEdit` is a pure, trusting translation from a
 * `ResolutionPlan` to a `vscode.WorkspaceEdit` — by design it does not
 * re-validate anything (`validateResolutionPlan` owns that). These tests
 * lock down that contract: given a plan, the edit it produces is
 * deterministic and reflects the plan exactly, including plans an
 * upstream validator would have rejected — proving the trust boundary is
 * exactly where the architecture says it is, not silently duplicated or
 * silently missing here.
 */

function asset(overrides: Partial<AnimoriaAsset>): AnimoriaAsset {
  return {
    path: '/workspace/assets/asset.json',
    name: 'asset.json',
    stem: 'asset',
    format: 'lottie',
    sizeBytes: 100,
    mtime: Date.now(),
    status: 'parsed',
    ...overrides,
  };
}

function planWith(overrides: Partial<ResolutionPlan>): ResolutionPlan {
  const canonicalAsset = asset({
    path: '/workspace/assets/canonical.json',
    name: 'canonical.json',
    stem: 'canonical',
  });
  const candidate: DuplicateCandidate = { asset: canonicalAsset, referenceCount: 1 };
  const group: DuplicateGroup = {
    id: 'hash-fixture',
    candidates: [candidate],
    sizeBytes: 100,
    potentialSavingsBytes: 0,
  };
  return {
    group,
    canonicalAsset,
    assetsToDelete: [],
    referenceUpdates: [],
    estimatedSavingsBytes: 0,
    ...overrides,
  };
}

describe('buildWorkspaceEdit', () => {
  it('translates a single reference replacement and a single deletion', () => {
    const duplicateAsset = asset({
      path: '/workspace/assets/dup.json',
      name: 'dup.json',
      stem: 'dup',
    });
    const plan = planWith({
      assetsToDelete: [duplicateAsset],
      referenceUpdates: [
        {
          file: '/workspace/src/App.tsx',
          line: 12,
          oldText: "'./assets/dup.json'",
          newText: "'./assets/canonical.json'",
        },
      ],
    });

    const edit = buildWorkspaceEdit(plan);

    expect(edit.textEdits).toEqual([
      expect.objectContaining({ newText: "'./assets/canonical.json'" }),
    ]);
    expect(edit.textEdits[0]?.uri.fsPath).toBe('/workspace/src/App.tsx');
    expect(edit.fileDeletions.map((u) => u.fsPath)).toEqual([duplicateAsset.path]);
  });

  it('handles multiple reference updates across multiple files, preserving order', () => {
    const plan = planWith({
      referenceUpdates: [
        { file: '/workspace/src/A.tsx', line: 3, oldText: 'a', newText: 'canonical-a' },
        { file: '/workspace/src/B.tsx', line: 7, oldText: 'b', newText: 'canonical-b' },
        { file: '/workspace/src/A.tsx', line: 9, oldText: 'c', newText: 'canonical-c' },
      ],
    });

    const edit = buildWorkspaceEdit(plan);

    expect(edit.textEdits.map((e) => `${e.uri.fsPath}:${e.newText}`)).toEqual([
      '/workspace/src/A.tsx:canonical-a',
      '/workspace/src/B.tsx:canonical-b',
      '/workspace/src/A.tsx:canonical-c',
    ]);
  });

  it("trusts a reference pointing at a file that no longer exists — existence is validateResolutionPlan's job, not this function's", () => {
    const plan = planWith({
      referenceUpdates: [
        { file: '/workspace/src/DoesNotExist.tsx', line: 1, oldText: 'x', newText: 'y' },
      ],
    });

    expect(() => buildWorkspaceEdit(plan)).not.toThrow();
    const edit = buildWorkspaceEdit(plan);
    expect(edit.textEdits).toHaveLength(1);
  });

  it('builds a deletion for a binary asset without inspecting its content', () => {
    const binaryDuplicate = asset({
      path: '/workspace/assets/dup.riv',
      name: 'dup.riv',
      stem: 'dup',
      format: 'rive',
    });
    const plan = planWith({ assetsToDelete: [binaryDuplicate] });

    const edit = buildWorkspaceEdit(plan);

    expect(edit.fileDeletions.map((u) => u.fsPath)).toEqual([binaryDuplicate.path]);
  });

  it('produces an empty edit for a plan with nothing to change', () => {
    const plan = planWith({});

    const edit = buildWorkspaceEdit(plan);

    expect(edit.textEdits).toHaveLength(0);
    expect(edit.fileDeletions).toHaveLength(0);
  });

  it('passes through a structurally invalid reference update (line 0) rather than silently correcting or dropping it', () => {
    const plan = planWith({
      referenceUpdates: [{ file: '/workspace/src/App.tsx', line: 0, oldText: 'x', newText: 'y' }],
    });

    const edit = buildWorkspaceEdit(plan);

    // Position is zero-based; line 0 in a ReferenceUpdate (1-based) maps to
    // Position(-1, 0) — nonsensical, and deliberately not guarded against
    // here. A plan this malformed should never reach this function in
    // practice (validateResolutionPlan / buildResolutionPlan are the real
    // guards); this test documents that this function will not catch it
    // either, rather than leaving that assumption unverified.
    expect(edit.textEdits[0]?.range.start.line).toBe(-1);
  });

  it('does not deduplicate identical reference updates — every plan entry becomes exactly one edit', () => {
    const duplicateUpdate = { file: '/workspace/src/App.tsx', line: 5, oldText: 'x', newText: 'y' };
    const plan = planWith({ referenceUpdates: [duplicateUpdate, { ...duplicateUpdate }] });

    const edit = buildWorkspaceEdit(plan);

    expect(edit.textEdits).toHaveLength(2);
  });

  it('is deterministic: the same plan produces the same edit content and order on every call', () => {
    const duplicateAsset = asset({
      path: '/workspace/assets/dup.json',
      name: 'dup.json',
      stem: 'dup',
    });
    const plan = planWith({
      assetsToDelete: [duplicateAsset],
      referenceUpdates: [
        { file: '/workspace/src/A.tsx', line: 1, oldText: 'x', newText: 'y' },
        { file: '/workspace/src/B.tsx', line: 2, oldText: 'p', newText: 'q' },
      ],
    });

    const first = buildWorkspaceEdit(plan);
    const second = buildWorkspaceEdit(structuredClone(plan));

    const shape = (edit: ReturnType<typeof buildWorkspaceEdit>) => ({
      textEdits: edit.textEdits.map((e) => ({ path: e.uri.fsPath, newText: e.newText })),
      fileDeletions: edit.fileDeletions.map((u) => u.fsPath),
    });

    expect(shape(first)).toEqual(shape(second));
  });
});
