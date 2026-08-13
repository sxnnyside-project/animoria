package com.sxnnyside.animoria.inspections

import com.intellij.codeInspection.InspectionManager
import com.intellij.codeInspection.LocalInspectionTool
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.codeInspection.ProblemHighlightType
import com.intellij.psi.PsiFile
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.RuleDiagnosticData

/**
 * Surfaces Animoria's governance findings through the IDE's own Problems view.
 *
 * ## Why an inspection on the asset, not an annotator on the reference
 * Animoria's findings are statements about an *asset file* — "nothing references
 * `hero.json`", "`spinner-copy.json` is byte-identical to `spinner.json`",
 * "`hero.gif` exceeds the configured size limit". None of them is a statement
 * about a particular line of Kotlin or TypeScript, so highlighting a referencing
 * line would attach the finding to a file that is not the subject of it. Opening
 * the asset and seeing what governance says about it is where a JetBrains
 * developer expects to find this, and it is the only placement that keeps the
 * finding attached to the thing it is actually about.
 *
 * ## Why it computes nothing
 * The whole body reads {@link AnimoriaAnalysisHolder} — the canonical analysis as
 * Core produced it — and translates each diagnostic into a `ProblemDescriptor`.
 * Severity, evidence, confidence and remediation all arrive already decided. A
 * Kotlin-side re-derivation here would be a second governance engine in the one
 * place a developer is most likely to trust what they see.
 *
 * ## Why an absent analysis produces no problems rather than a clean bill
 * `null` from the holder means the daemon has not reported yet. Returning an
 * empty array is correct — there is nothing to show — but it deliberately does
 * not mean "this asset is fine", and no caller can read it that way, because an
 * inspection has no vocabulary for asserting health in the first place.
 */
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
            }
            .toTypedArray()
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
