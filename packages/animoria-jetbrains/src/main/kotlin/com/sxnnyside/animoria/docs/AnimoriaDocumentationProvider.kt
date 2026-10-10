package com.sxnnyside.animoria.docs

import com.intellij.lang.documentation.AbstractDocumentationProvider
import com.intellij.psi.PsiElement
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset

/**
 * Quick Documentation provider delivering rich metadata, governance status,
 * dimensions, and usage tracking for visual asset references in source code.
 */
class AnimoriaDocumentationProvider : AbstractDocumentationProvider() {
    override fun generateDoc(
        element: PsiElement?,
        originalElement: PsiElement?,
    ): String? {
        val target = originalElement ?: element ?: return null
        val project = target.project
        val holder = AnimoriaAnalysisHolder.of(project)
        val text = target.text?.trim('"', '\'', '`', ' ') ?: return null
        if (text.isEmpty()) return null

        val asset =
            holder.assetForPath(text)
                ?: holder.current()?.assets?.firstOrNull {
                    it.name.equals(text, ignoreCase = true) ||
                        it.stem.equals(text, ignoreCase = true) ||
                        it.path.endsWith(text)
                }
                ?: return null

        return renderDoc(asset, holder)
    }

    private fun renderDoc(
        asset: JetBrainsAsset,
        holder: AnimoriaAnalysisHolder,
    ): String {
        val diagnostics = holder.diagnosticsFor(asset.path)
        val references = holder.referencesForAsset(asset.path)

        val statusHtml =
            if (diagnostics.isEmpty()) {
                "<span style='color: #4CAF50;'><b>✓ Governance: Clean</b></span>"
            } else {
                val issues = diagnostics.joinToString(", ") { it.ruleId }
                "<span style='color: #FFA726;'><b>⚠ Governance Findings:</b> $issues</span>"
            }

        val dimText =
            asset.dimensions?.let { "${it.width}×${it.height} px" }
                ?: if (asset.motionMetadata != null && asset.motionMetadata.durationSecs > 0) {
                    val dur = String.format(java.util.Locale.ROOT, "%.2f s", asset.motionMetadata.durationSecs)
                    val fps = asset.motionMetadata.fps
                    "$dur @ ${fps.toInt()} fps"
                } else {
                    null
                }

        val dimHtml = dimText?.let { " &nbsp;|&nbsp; <b>Dimensions:</b> $it" } ?: ""
        val refsHtml =
            if (references.isNotEmpty()) {
                val files =
                    references
                        .map { it.reference.file.substringAfterLast('/') }
                        .distinct()
                        .take(3)
                        .joinToString(", ")
                "<p><b>Usages:</b> ${references.size} reference(s) (in $files)</p>"
            } else {
                "<p><b>Usages:</b> No active references detected</p>"
            }

        return """
            <div class='definition'><b>Animoria Asset</b>: <code>${asset.name}</code></div>
            <div class='content'>
                <p><b>Format:</b> ${asset.format.uppercase()}$dimHtml &nbsp;|&nbsp; <b>Size:</b> ${formatBytes(asset.sizeBytes)}</p>
                <p><b>Path:</b> <code>${asset.path}</code></p>
                $refsHtml
                <p>$statusHtml</p>
            </div>
            """.trimIndent()
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", kb)
        val mb = kb / 1024.0
        return String.format(java.util.Locale.ROOT, "%.2f MB", mb)
    }
}
