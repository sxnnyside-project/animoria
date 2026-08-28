use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::contracts::analysis::{
    HealthScoreReport, LifecycleState, RuleDiagnostic, WorkspaceAnalysis,
};
use crate::contracts::asset::{Asset, MotionMetadata, StaticMetadata};
use crate::contracts::duplicates::DuplicateGroup;
use crate::contracts::usage::UsageReference;
use crate::deduplication::{find_duplicate_groups, hash_assets_in_parallel};
use crate::governance::{AnalysisContext, GovernanceEngine, GovernancePolicy};
use crate::parser::{detect_format, ParserRegistry};
use crate::scanner::WorkspaceScanner;
use crate::tracing::AssetReferenceDetector;

#[derive(Debug, Clone)]
pub struct AssetIndex {
    root_id: String,
    root_path: PathBuf,
    assets: HashMap<String, Asset>,
    references: Vec<UsageReference>,
    duplicate_groups: Vec<DuplicateGroup>,
    diagnostics: Vec<RuleDiagnostic>,
    health_score: HealthScoreReport,
    state: LifecycleState,
    parser_registry: ParserRegistry,
}

impl AssetIndex {
    pub fn new(root_id: String, root_path: PathBuf) -> Self {
        Self {
            root_id,
            root_path,
            assets: HashMap::new(),
            references: Vec::new(),
            duplicate_groups: Vec::new(),
            diagnostics: Vec::new(),
            health_score: HealthScoreReport {
                score: 100,
                grade: "A".to_string(),
                categories: vec![],
                summary: "Initialized".to_string(),
            },
            state: LifecycleState::Initializing,
            parser_registry: ParserRegistry::new(),
        }
    }

    pub fn root_id(&self) -> &str {
        &self.root_id
    }

    pub fn root_path(&self) -> &Path {
        &self.root_path
    }

    pub fn state(&self) -> LifecycleState {
        self.state
    }

    pub fn assets(&self) -> Vec<Asset> {
        let mut list: Vec<Asset> = self.assets.values().cloned().collect();
        list.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
        list
    }

    pub fn references(&self) -> &[UsageReference] {
        &self.references
    }

    pub fn duplicate_groups(&self) -> &[DuplicateGroup] {
        &self.duplicate_groups
    }

    pub fn diagnostics(&self) -> &[RuleDiagnostic] {
        &self.diagnostics
    }

    pub fn health_score(&self) -> &HealthScoreReport {
        &self.health_score
    }

    /// Ingests a single file path into the index.
    pub fn ingest_file(&mut self, path: &Path) -> Option<Asset> {
        let format_res = detect_format(path)?;

        let metadata = fs::metadata(path).ok()?;
        let size_bytes = metadata.len();
        let mtime_ms = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let relative_path = path
            .strip_prefix(&self.root_path)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let stem = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();

        let canonical = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
        let id = compute_asset_id(&canonical);

        let (format, kind, is_valid_discovery, error_discovery) = match format_res {
            Ok(fmt) => (fmt, fmt.kind(), true, None),
            Err(err_msg) => {
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or_default()
                    .to_lowercase();
                let fmt = match ext.as_str() {
                    "json" => crate::contracts::asset::AssetFormat::Lottie,
                    "lottie" => crate::contracts::asset::AssetFormat::DotLottie,
                    "riv" => crate::contracts::asset::AssetFormat::Rive,
                    "gif" => crate::contracts::asset::AssetFormat::Gif,
                    "svg" => crate::contracts::asset::AssetFormat::Svg,
                    "png" => crate::contracts::asset::AssetFormat::Png,
                    "webp" => crate::contracts::asset::AssetFormat::Webp,
                    "avif" => crate::contracts::asset::AssetFormat::Avif,
                    _ => crate::contracts::asset::AssetFormat::Jpeg,
                };
                (fmt, fmt.kind(), false, Some(err_msg))
            }
        };

        let motion = if matches!(kind, crate::contracts::asset::AssetKind::Motion) {
            Some(MotionMetadata::default())
        } else {
            None
        };

        let static_meta = if matches!(kind, crate::contracts::asset::AssetKind::Static) {
            Some(StaticMetadata::default())
        } else {
            None
        };

        let mut asset = Asset {
            id: id.clone(),
            path: canonical.to_string_lossy().to_string(),
            relative_path,
            name,
            stem,
            size_bytes,
            mtime_ms,
            kind,
            format,
            content_hash: None,
            dimensions: None,
            motion,
            static_meta,
            is_valid: is_valid_discovery,
            error: error_discovery,
        };

        // If discovery was successful, run deep parser to enrich with dimensions & metadata
        if asset.is_valid {
            self.parser_registry.parse_asset(path, &mut asset);
        }

        self.assets.insert(id, asset.clone());
        Some(asset)
    }

    /// Full workspace governance analysis pipeline:
    /// Ingest ➔ Binary SHA-256 Hashing ➔ Deduplication ➔ Multi-Syntax Usage Tracing ➔ Rule Evaluation
    pub fn scan_workspace(&mut self, custom_ignore_patterns: &[String]) -> anyhow::Result<WorkspaceAnalysis> {
        self.state = LifecycleState::Analyzing;
        self.assets.clear();
        self.references.clear();
        self.duplicate_groups.clear();
        self.diagnostics.clear();

        // 1. Filesystem crawler
        let scanner = WorkspaceScanner::new(self.root_path.clone(), custom_ignore_patterns)?;
        let candidates = scanner.scan_candidates();

        for candidate in candidates {
            self.ingest_file(&candidate);
        }

        // 2. Parallel SHA-256 binary content hashing
        let mut asset_list: Vec<Asset> = self.assets.values().cloned().collect();
        hash_assets_in_parallel(&mut asset_list);

        for asset in &asset_list {
            self.assets.insert(asset.id.clone(), asset.clone());
        }

        // 3. Duplicate group clustering
        self.duplicate_groups = find_duplicate_groups(&asset_list);

        // 4. Multi-syntax source code reference tracing
        let detector = AssetReferenceDetector::new(self.root_path.clone(), custom_ignore_patterns)?;
        self.references = detector.detect_references(&asset_list);

        // 5. Governance policy & rule evaluation
        let policy = GovernancePolicy::load_from_workspace(&self.root_path);
        let ctx = AnalysisContext::new(
            &self.root_path,
            &asset_list,
            &self.references,
            &self.duplicate_groups,
            &policy,
        );

        let engine = GovernanceEngine::new();
        let (diagnostics, health_score) = engine.evaluate(&ctx);
        self.diagnostics = diagnostics;
        self.health_score = health_score;

        self.state = LifecycleState::Ready;
        Ok(self.to_workspace_analysis())
    }

    pub fn to_workspace_analysis(&self) -> WorkspaceAnalysis {
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        WorkspaceAnalysis {
            root_id: self.root_id.clone(),
            root_path: self.root_path.to_string_lossy().to_string(),
            state: self.state,
            assets: self.assets(),
            diagnostics: self.diagnostics.clone(),
            health_score: self.health_score.clone(),
            indexed_at_ms: now_ms,
        }
    }
}

fn compute_asset_id(path: &Path) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.to_string_lossy().as_bytes());
    let hash = hasher.finalize();
    let hex: String = hash[..8].iter().map(|b| format!("{:02x}", b)).collect();
    format!("asset-{}", hex)
}
