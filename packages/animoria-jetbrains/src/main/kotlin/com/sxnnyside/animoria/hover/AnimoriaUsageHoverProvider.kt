package com.sxnnyside.animoria.hover

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.Project
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset

/**
 * What Animoria knows about the line under the cursor.
 *
 * ## What this replaces, and why not the original
 * `AnimoriaEditorHoverListener` did a substring match of asset *stems* against raw
 * document text, in Kotlin, and its own doc comment conceded that it was "an
 * approximation, not authoritative matching" and that reimplementing
 * `reference-patterns.ts` here would violate the architecture. It was deleted in the
 * shared-UI migration with nothing in its place, so VS Code kept an editor hover and
 * JetBrains simply lost one.
 *
 * Restoring the *file* is not the goal; restoring the *capability* is. This asks Core
 * — through `getUsageReferences`, which the daemon now implements — which assets are
 * referenced from this file and on which lines. Nothing here matches text, ranks
 * candidates, or decides what counts as a reference.
 *
 * ## Why a plain resolver rather than an IntelliJ hover extension point
 * `LineMarkerProvider` and `ExternalAnnotator` operate on the PSI tree, which has
 * per-token structure only for languages the IDE actually parses. Animoria's scan
 * targets JS/TS, Swift, Kotlin, Dart, Vue and Python; outside the JVM languages most
 * of those collapse to a single leaf without their own plugin. Answering from a
 * document line keeps the behaviour identical across every file type, which is also
 * how VS Code's provider works.
 *
 * ## Why the answer is cached rather than fetched per mouse move
 * The daemon round trip is milliseconds, but a hover fires continuously while the
 * pointer moves. The reference set for a file changes only when the analysis does, so
 * it is fetched per analysis generation and read synchronously afterwards — a hover
 * that awaited a subprocess would stutter, and one that fetched per pixel would
 * saturate the daemon.
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
