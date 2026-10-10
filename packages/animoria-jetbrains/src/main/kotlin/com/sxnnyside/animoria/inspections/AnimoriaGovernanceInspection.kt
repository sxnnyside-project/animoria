package com.sxnnyside.animoria.inspections

import com.intellij.codeInspection.InspectionManager
import com.intellij.codeInspection.LocalInspectionTool
import com.intellij.codeInspection.LocalQuickFix
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.codeInspection.ProblemHighlightType
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFile
import com.sxnnyside.animoria.actions.AnimoriaActionHost
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.RuleDiagnosticData
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows

// Surfaces Animoria's governance findings in the IDE's Problems view, attached to the asset file itself
// (not a referencing line, since findings are about the asset). Reads AnimoriaAnalysisHolder verbatim — no
// re-derivation. A null analysis yields no problems, which means "not reported yet", not "this asset is fine".
class AnimoriaGovernanceInspection : LocalInspectionTool() {
    override fun getDisplayName(): String = "Animoria asset governance"

    override fun getGroupDisplayName(): String = "Animoria"

    override fun getShortName(): String = "AnimoriaGovernance"

    override fun checkFile(
        file: PsiFile,
        manager: InspectionManager,
        isOnTheFly: Boolean,
    ): Array<ProblemDescriptor>? {
        val path = file.virtualFile?.path ?: return null
        val diagnostics = AnimoriaAnalysisHolder.of(file.project).diagnosticsFor(path)
        if (diagnostics.isEmpty()) return null

        return diagnostics
            .map { diagnostic ->
                manager.createProblemDescriptor(
                    file,
                    describe(diagnostic),
                    isOnTheFly,
                    quickFixesFor(diagnostic, path),
                    highlightFor(diagnostic),
                )
            }.toTypedArray()
    }

    /**
     * Non-destructive quick fixes that guide the developer into the safe confirmation flow
     * rather than performing silent destructive modifications directly.
     */
    private fun quickFixesFor(
        diagnostic: RuleDiagnosticData,
        assetPath: String,
    ): Array<LocalQuickFix> {
        val fixes = mutableListOf<LocalQuickFix>()
        when (diagnostic.ruleId) {
            "no-unreferenced-assets" -> {
                fixes.add(AnimoriaReviewCleanupQuickFix())
                fixes.add(AnimoriaShowInGalleryQuickFix(assetPath))
            }
            "no-duplicate-assets" -> {
                fixes.add(AnimoriaResolveDuplicatesQuickFix(assetPath))
                fixes.add(AnimoriaShowInGalleryQuickFix(assetPath))
            }
            else -> {
                fixes.add(AnimoriaShowInGalleryQuickFix(assetPath))
            }
        }
        return fixes.toTypedArray()
    }

    /**
     * The message a developer reads in Problems.
     *
     * Carries the evidence and the confidence alongside the finding, because a
     * governance claim without either is one a developer can only accept or
     * ignore — not evaluate.
     */
    private fun describe(diagnostic: RuleDiagnosticData): String =
        buildString {
            append(diagnostic.message)
            append("  [")
            append(diagnostic.ruleId)
            append(']')
            if (diagnostic.evidence.summary.isNotBlank()) {
                append("\n")
                append(diagnostic.evidence.summary)
            }
            append("\nConfidence: ")
            append(diagnostic.confidence)
            diagnostic.coverage?.let { coverage ->
                // An absence finding means something different when the search that
                // produced it did not read every format that can hold a reference.
                append(" · reference scan: ")
                append(coverage.status)
                append(" (")
                append(coverage.filesScanned)
                append(" file(s))")
            }
            if (diagnostic.remediation.summary.isNotBlank()) {
                append("\n")
                append(diagnostic.remediation.summary)
            }
        }

    /** Core owns severity; this maps it, and never reinterprets it. */
    private fun highlightFor(diagnostic: RuleDiagnosticData): ProblemHighlightType =
        when {
            diagnostic.ruleId == "no-unreferenced-assets" -> ProblemHighlightType.LIKE_UNUSED_SYMBOL
            diagnostic.severity == "error" -> ProblemHighlightType.GENERIC_ERROR
            else -> ProblemHighlightType.GENERIC_ERROR_OR_WARNING
        }
}

/**
 * Safe navigation quick fix that opens Animoria's Cleanup review tab for unreferenced assets.
 * Preserves the review-and-confirm flow with preview and trash session safeguards.
 */
class AnimoriaReviewCleanupQuickFix : LocalQuickFix {
    override fun getName(): String = "Review Safe Cleanup in Animoria…"

    override fun getFamilyName(): String = "Animoria Governance"

    override fun applyFix(
        project: Project,
        descriptor: ProblemDescriptor,
    ) {
        AnimoriaActionHost.of(project).reviewCleanup()
    }
}

/**
 * Safe navigation quick fix that focuses the duplicate resolution interface for duplicate assets.
 */
class AnimoriaResolveDuplicatesQuickFix(
    private val assetPath: String,
) : LocalQuickFix {
    override fun getName(): String = "Resolve Duplicates in Animoria…"

    override fun getFamilyName(): String = "Animoria Governance"

    override fun applyFix(
        project: Project,
        descriptor: ProblemDescriptor,
    ) {
        AnimoriaToolWindows.show(project, "Duplicates")
        AnimoriaSharedUiPanel.of(project, "duplicates")?.focus(
            AnimoriaSharedUiPanel.Focus(tab = "duplicates", assetPath = assetPath),
        )
    }
}

/**
 * Safe navigation quick fix that reveals the asset inside the Animoria Gallery & Inspector preview.
 */
class AnimoriaShowInGalleryQuickFix(
    private val assetPath: String,
) : LocalQuickFix {
    override fun getName(): String = "Show in Animoria Gallery"

    override fun getFamilyName(): String = "Animoria Governance"

    override fun applyFix(
        project: Project,
        descriptor: ProblemDescriptor,
    ) {
        AnimoriaToolWindows.show(project, "Preview")
        AnimoriaSharedUiPanel.of(project, "inspector")?.focus(
            AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = assetPath),
        )
    }
}
