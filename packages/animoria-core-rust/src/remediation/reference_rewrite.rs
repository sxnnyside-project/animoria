//! Computes reviewable source-rewrite proposals for a duplicate resolution —
//! the real replacement for the `references_to_rewrite` field that shipped
//! in early v2.0.0 always empty and was removed rather than implemented.
//!
//! Scope is deliberately propose-only: this never edits a file itself.
//!
//! ## Why one generic rewriter instead of 26 per-syntax parsers
//! `tracing::detector` — the module that finds these references in the first
//! place — is already a line-heuristic scanner, not a set of per-language AST
//! parsers: it matches a filename/stem with Aho-Corasick and validates the
//! surrounding line with substring checks (`tracing::patterns`). A rewriter
//! can't safely be more structurally precise than the detector that found the
//! reference, so this extracts the *whole path token* around the matched
//! filename — the maximal run of path characters, regardless of which quote
//! character or which of the 26 traced extensions surrounds it — and
//! recomputes it as a real relative path from the referencing file to the
//! canonical asset, preserving the token's own relative-path style (`./`,
//! `../`, or bare). That is what "preserves quote style" actually means here:
//! quotes are never touched because they sit outside the extracted token.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::contracts::asset::Asset;
use crate::contracts::remediation::ReferenceRewriteProposal;
use crate::contracts::usage::UsageReference;

fn is_path_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '.' | '/' | '-' | '_' | '@')
}

/// Finds the maximal run of path characters in `line` that contains
/// `needle` (typically a filename), returning its byte range. This is what
/// lets the rewrite touch the whole `./assets/old-icon.svg` token rather
/// than just the `old-icon.svg` filename inside it, without caring whether
/// it's wrapped in `"`, `'`, `` ` ``, or an unquoted CSS `url(...)`— those
/// delimiters aren't path characters, so they naturally bound the token.
fn extract_path_token(line: &str, needle: &str) -> Option<(usize, usize)> {
    let needle_start = line.find(needle)?;
    let needle_end = needle_start + needle.len();

    let mut start = needle_start;
    while start > 0 {
        let prev_char = line[..start].chars().next_back()?;
        if !is_path_char(prev_char) {
            break;
        }
        start -= prev_char.len_utf8();
    }

    let mut end = needle_end;
    while end < line.len() {
        let next_char = line[end..].chars().next()?;
        if !is_path_char(next_char) {
            break;
        }
        end += next_char.len_utf8();
    }

    Some((start, end))
}

/// Computes a real relative path from `from_file_path`'s directory to
/// `to_asset_path`, mirroring `old_token`'s own relative-path style: an
/// explicit `./`/`../` token gets `./` back when it turns out to stay in the
/// same directory, a bare token (`assets/foo.svg`, no leading dot) stays
/// bare in that case — but climbing directories always needs `../`
/// regardless of the old token's style, since there's no bare way to say
/// "go up."
fn compute_relative_path(from_file_path: &str, to_asset_path: &str, old_token: &str) -> String {
    let from_dir = Path::new(from_file_path)
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let to = Path::new(to_asset_path);

    let from_comps: Vec<_> = from_dir.components().collect();
    let to_comps: Vec<_> = to.components().collect();

    let common = from_comps
        .iter()
        .zip(to_comps.iter())
        .take_while(|(a, b)| a == b)
        .count();
    let ups = from_comps.len() - common;

    let mut segments: Vec<String> = (0..ups).map(|_| "..".to_string()).collect();
    segments.extend(
        to_comps[common..]
            .iter()
            .map(|c| c.as_os_str().to_string_lossy().to_string()),
    );
    let joined = segments.join("/");

    if ups == 0 && (old_token.starts_with("./") || old_token.starts_with("../")) {
        format!("./{joined}")
    } else {
        joined
    }
}

/// Proposes one full-path rewrite per traced reference that points at an
/// asset in `target_assets_to_delete`, retargeting it at
/// `canonical_asset_id`'s real location. Silently skips a reference whose
/// `line_content` doesn't literally contain the old filename (e.g. traced
/// through an alias/re-export this pass can't safely rewrite) rather than
/// proposing a rewrite that wouldn't apply cleanly.
pub fn propose_reference_rewrites(
    references: &[UsageReference],
    assets: &[Asset],
    target_assets_to_delete: &[String],
    canonical_asset_id: &str,
) -> Vec<ReferenceRewriteProposal> {
    let by_id: HashMap<&str, &Asset> = assets.iter().map(|a| (a.id.as_str(), a)).collect();
    let Some(canonical) = by_id.get(canonical_asset_id) else {
        return Vec::new();
    };

    // `UsageReference.asset_id` is actually populated with the referenced
    // asset's *path* (see `tracing::detector`), not its hashed `Asset.id` —
    // matching against `target_assets_to_delete` (real ids) needs going
    // through each deleted asset's path instead.
    let by_path: HashMap<&str, &Asset> = assets.iter().map(|a| (a.path.as_str(), a)).collect();
    let deleted_paths: HashSet<&str> = target_assets_to_delete
        .iter()
        .filter_map(|id| by_id.get(id.as_str()))
        .map(|a| a.path.as_str())
        .collect();

    references
        .iter()
        .filter(|r| deleted_paths.contains(r.asset_id.as_str()))
        .filter_map(|r| {
            let old_asset = by_path.get(r.asset_id.as_str())?;
            if old_asset.name == canonical.name && old_asset.path == canonical.path {
                return None;
            }

            let (start, end) = extract_path_token(&r.line_content, old_asset.name.as_str())?;
            let old_token = &r.line_content[start..end];
            let new_token = compute_relative_path(&r.file_path, &canonical.path, old_token);

            let mut proposed_line = String::with_capacity(r.line_content.len());
            proposed_line.push_str(&r.line_content[..start]);
            proposed_line.push_str(&new_token);
            proposed_line.push_str(&r.line_content[end..]);

            if proposed_line == r.line_content {
                return None;
            }

            Some(ReferenceRewriteProposal {
                file_path: r.file_path.clone(),
                line_number: r.line_number,
                original_line: r.line_content.clone(),
                proposed_line,
            })
        })
        .collect()
}

/// Applies one already-confirmed proposal to disk: reads `file_path`,
/// replaces line `line_number` (1-indexed, matching `UsageReference`) if and
/// only if it still literally equals `original_line`, and writes the file
/// back. Refuses rather than guessing when the file has since changed —
/// the confirmation was for that exact line, not "whatever's there now."
/// `workspace_root` is required and enforced the same way `TrashManager`
/// enforces it for `stage_to_trash`/`restore_from_trash`: a client-supplied
/// proposal is a plan the daemon already computed, but nothing stops a
/// modified or replayed request from naming an arbitrary path, so this
/// refuses to touch anything outside the workspace it was scoped to rather
/// than trusting the proposal's `file_path` unconditionally.
pub fn apply_reference_rewrite(
    proposal: &ReferenceRewriteProposal,
    workspace_root: &Path,
) -> Result<(), String> {
    let canonical_root =
        std::fs::canonicalize(workspace_root).unwrap_or_else(|_| workspace_root.to_path_buf());
    let canonical_target = std::fs::canonicalize(&proposal.file_path)
        .map_err(|e| format!("could not resolve {}: {e}", proposal.file_path))?;
    if !canonical_target.starts_with(&canonical_root) {
        return Err(format!(
            "refusing to rewrite '{}': it is outside the workspace root '{}'",
            canonical_target.display(),
            canonical_root.display()
        ));
    }

    let contents = std::fs::read_to_string(&proposal.file_path)
        .map_err(|e| format!("could not read {}: {e}", proposal.file_path))?;

    let uses_crlf = contents.contains("\r\n");
    let mut lines: Vec<String> = contents.lines().map(str::to_string).collect();
    let idx = proposal.line_number as usize;
    if idx == 0 || idx > lines.len() {
        return Err(format!(
            "{} no longer has a line {}",
            proposal.file_path, proposal.line_number
        ));
    }

    let current = &lines[idx - 1];
    if current != &proposal.original_line {
        return Err(format!(
            "{}:{} has changed since this rewrite was proposed — refusing to overwrite it",
            proposal.file_path, proposal.line_number
        ));
    }

    lines[idx - 1] = proposal.proposed_line.clone();
    let newline = if uses_crlf { "\r\n" } else { "\n" };
    let mut rejoined = lines.join(newline);
    if contents.ends_with(newline) || contents.ends_with('\n') {
        rejoined.push_str(newline);
    }

    std::fs::write(&proposal.file_path, rejoined)
        .map_err(|e| format!("could not write {}: {e}", proposal.file_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contracts::asset::{AssetFormat, AssetKind};

    fn asset(id: &str, path: &str) -> Asset {
        let name = Path::new(path)
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string();
        Asset {
            id: id.to_string(),
            path: path.to_string(),
            relative_path: path.trim_start_matches('/').to_string(),
            stem: name.trim_end_matches(".svg").to_string(),
            name,
            size_bytes: 10,
            mtime_ms: 0,
            kind: AssetKind::Static,
            format: AssetFormat::Svg,
            content_hash: None,
            dimensions: None,
            motion: None,
            static_meta: None,
            thumbnail_path: None,
            is_valid: true,
            error: None,
        }
    }

    fn usage_ref(asset_id: &str, file_path: &str, line_content: &str) -> UsageReference {
        UsageReference {
            asset_id: asset_id.to_string(),
            file_path: file_path.to_string(),
            relative_file_path: file_path.trim_start_matches('/').to_string(),
            line_number: 3,
            line_content: line_content.to_string(),
            syntax_type: "jsx-attribute".to_string(),
            confidence: "high".to_string(),
        }
    }

    #[test]
    fn preserves_bare_relative_style_when_the_canonical_asset_is_in_the_same_directory() {
        let assets = vec![
            asset("dup-1", "/ws/src/assets/old-icon.svg"),
            asset("keep-1", "/ws/src/assets/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "/ws/src/assets/old-icon.svg",
            "/ws/src/App.tsx",
            "  <img src=\"assets/old-icon.svg\" />",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");

        assert_eq!(proposals.len(), 1);
        assert_eq!(
            proposals[0].proposed_line,
            "  <img src=\"assets/canonical-icon.svg\" />"
        );
        assert_eq!(proposals[0].original_line, refs[0].line_content);
        assert_eq!(proposals[0].line_number, 3);
    }

    #[test]
    fn preserves_explicit_dot_slash_style_in_the_same_directory() {
        let assets = vec![
            asset("dup-1", "/ws/src/old-icon.svg"),
            asset("keep-1", "/ws/src/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "/ws/src/old-icon.svg",
            "/ws/src/App.tsx",
            "import icon from './old-icon.svg';",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");

        assert_eq!(
            proposals[0].proposed_line,
            "import icon from './canonical-icon.svg';"
        );
    }

    #[test]
    fn climbs_directories_with_dot_dot_regardless_of_the_old_token_style() {
        // The canonical asset lives in a sibling directory of the referencing
        // file, one level up — the old bare token can't express that, so the
        // rewrite must introduce `../` even though the original had none.
        let assets = vec![
            asset("dup-1", "/ws/src/components/old-icon.svg"),
            asset("keep-1", "/ws/src/assets/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "/ws/src/components/old-icon.svg",
            "/ws/src/components/Widget.tsx",
            "<img src=\"old-icon.svg\" />",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");

        assert_eq!(
            proposals[0].proposed_line,
            "<img src=\"../assets/canonical-icon.svg\" />"
        );
    }

    #[test]
    fn quote_characters_around_the_token_are_never_touched() {
        let assets = vec![
            asset("dup-1", "/ws/src/old-icon.svg"),
            asset("keep-1", "/ws/src/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "/ws/src/old-icon.svg",
            "/ws/src/App.tsx",
            "background: url('./old-icon.svg') no-repeat;",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");

        assert_eq!(
            proposals[0].proposed_line,
            "background: url('./canonical-icon.svg') no-repeat;"
        );
    }

    #[test]
    fn skips_references_to_assets_not_in_the_delete_list() {
        let assets = vec![
            asset("dup-1", "/ws/src/old-icon.svg"),
            asset("keep-1", "/ws/src/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "other-asset",
            "/ws/src/App.tsx",
            "<img src=\"./other.svg\" />",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");
        assert!(proposals.is_empty());
    }

    #[test]
    fn skips_a_line_that_does_not_literally_contain_the_old_filename() {
        let assets = vec![
            asset("dup-1", "/ws/src/old-icon.svg"),
            asset("keep-1", "/ws/src/canonical-icon.svg"),
        ];
        let refs = vec![usage_ref(
            "/ws/src/old-icon.svg",
            "/ws/src/App.tsx",
            "import icon from ICON_PATH",
        )];

        let proposals =
            propose_reference_rewrites(&refs, &assets, &["dup-1".to_string()], "keep-1");
        assert!(proposals.is_empty());
    }

    #[test]
    fn apply_reference_rewrite_rewrites_only_the_confirmed_line() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("App.tsx");
        std::fs::write(
            &path,
            "line one\n<img src=\"./old-icon.svg\" />\nline three\n",
        )
        .unwrap();

        let proposal = ReferenceRewriteProposal {
            file_path: path.to_string_lossy().to_string(),
            line_number: 2,
            original_line: "<img src=\"./old-icon.svg\" />".to_string(),
            proposed_line: "<img src=\"./canonical-icon.svg\" />".to_string(),
        };

        apply_reference_rewrite(&proposal, dir.path()).expect("rewrite should apply");

        let updated = std::fs::read_to_string(&path).unwrap();
        assert_eq!(
            updated,
            "line one\n<img src=\"./canonical-icon.svg\" />\nline three\n"
        );
    }

    #[test]
    fn apply_reference_rewrite_refuses_when_the_line_has_changed() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("App.tsx");
        std::fs::write(&path, "<img src=\"./something-else.svg\" />\n").unwrap();

        let proposal = ReferenceRewriteProposal {
            file_path: path.to_string_lossy().to_string(),
            line_number: 1,
            original_line: "<img src=\"./old-icon.svg\" />".to_string(),
            proposed_line: "<img src=\"./canonical-icon.svg\" />".to_string(),
        };

        let result = apply_reference_rewrite(&proposal, dir.path());
        assert!(result.is_err());

        let unchanged = std::fs::read_to_string(&path).unwrap();
        assert_eq!(unchanged, "<img src=\"./something-else.svg\" />\n");
    }

    #[test]
    fn apply_reference_rewrite_refuses_a_file_outside_the_workspace_root() {
        let workspace = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let path = outside.path().join("App.tsx");
        std::fs::write(&path, "<img src=\"./old-icon.svg\" />\n").unwrap();

        let proposal = ReferenceRewriteProposal {
            file_path: path.to_string_lossy().to_string(),
            line_number: 1,
            original_line: "<img src=\"./old-icon.svg\" />".to_string(),
            proposed_line: "<img src=\"./canonical-icon.svg\" />".to_string(),
        };

        let result = apply_reference_rewrite(&proposal, workspace.path());
        assert!(result.is_err());

        let unchanged = std::fs::read_to_string(&path).unwrap();
        assert_eq!(unchanged, "<img src=\"./old-icon.svg\" />\n");
    }
}
