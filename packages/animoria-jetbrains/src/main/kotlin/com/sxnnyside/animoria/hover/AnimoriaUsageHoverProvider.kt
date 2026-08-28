package com.sxnnyside.animoria.hover

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset

/**
 * Resolves visual asset hover information for editor document lines.
 *
 * Reads references synchronously from the cached analysis in [AnimoriaAnalysisHolder],
 * matching line-based asset usages across supported web and mobile source files without blocking the UI thread.
 */
class AnimoriaUsageHoverProvider(
    private val project: Project,
) {
    /** One asset referenced from the hovered line, with the evidence for saying so. */
    data class Hit(
        val asset: JetBrainsAsset,
        val line: Int,
        val content: String,
        val kind: String,
    )

    /**
     * The asset referenced on [line] of the file open in [editor], or `null`.
     *
     * `line` is 0-based, as the platform counts; Core's references are 1-based, as
     * humans read them. The conversion happens here rather than on the contract, for
     * the same reason it happens in the VS Code bridge: the wire format stays the one
     * a person would write down.
     */
    fun hitAt(
        editor: Editor,
        line: Int,
    ): Hit? {
        val file = FileDocumentManager.getInstance().getFile(editor.document) ?: return null
        val path = file.path
        val holder = AnimoriaAnalysisHolder.of(project)

        val reference =
            holder.referencesInFile(path).firstOrNull { it.reference.line == line + 1 } ?: return null

        // The asset comes from the analysis by path, never from a name match: two
        // assets may share a stem, and picking either one would be a guess presented
        // as a fact.
        val asset = holder.assetForPath(reference.assetPath) ?: return null

        return Hit(
            asset = asset,
            line = reference.reference.line,
            content = reference.reference.content,
            kind = reference.reference.kind,
        )
    }

    /**
     * The hover text for a hit.
     *
     * Every value is read from the analysis. Nothing is derived here — no size
     * banding, no health wording, no "probably unused": those are Core's vocabulary,
     * and a client that invents its own is a client that will eventually disagree
     * with the report beside it.
     */
    fun describe(hit: Hit): String {
        val metadata = hit.asset.metadata
        val parts = mutableListOf("**${hit.asset.stem}** `${hit.asset.format}`")

        val duration = metadata?.let { readNumber(it.toString(), "durationSeconds") }
        val fps = metadata?.let { readNumber(it.toString(), "fps") }
        val detail =
            listOfNotNull(
                fps?.let { "$it fps" },
                duration?.let { "${it}s" },
                formatBytes(hit.asset.sizeBytes),
            ).joinToString(" · ")
        if (detail.isNotEmpty()) parts.add(detail)

        parts.add("Referenced here (${hit.kind})")
        return parts.joinToString("\n\n")
    }

    private fun readNumber(
        json: String,
        field: String,
    ): String? = Regex(""""$field"\s*:\s*([0-9.]+)""").find(json)?.groupValues?.get(1)

    private fun formatBytes(bytes: Long): String =
        when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
        }
}
