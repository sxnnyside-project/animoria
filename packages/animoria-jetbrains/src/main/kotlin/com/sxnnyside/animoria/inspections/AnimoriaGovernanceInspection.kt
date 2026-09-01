package com.sxnnyside.animoria.inspections

import com.intellij.codeInspection.InspectionManager
import com.intellij.codeInspection.LocalInspectionTool
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.codeInspection.ProblemHighlightType
import com.intellij.psi.PsiFile
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.RuleDiagnosticData

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
                    // No quick fixes are offered here on purpose. Every remediation
                    // Animoria knows for these findings is destructive (remove the
                    // asset, resolve a duplicate group), and a destructive action
                    // must go through the review-and-confirm flow with its preview
                    // and its trash session — not a one-keystroke intention that
                    // skips both. The remediation text tells the developer what to
                    // do; the tool window is where they do it.
                    emptyArray(),
                    highlightFor(diagnostic),
                )
            }.toTypedArray()
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
        when (diagnostic.severity) {
            "error" -> ProblemHighlightType.GENERIC_ERROR
            else -> ProblemHighlightType.GENERIC_ERROR_OR_WARNING
        }
}
