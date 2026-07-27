package com.sxnnyside.animoria.hover

import com.intellij.codeInsight.hint.HintManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.editor.event.EditorMouseEvent
import com.intellij.openapi.editor.event.EditorMouseMotionListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset

/** Below this length, a stem (e.g. "ui", "app", "test") is too likely to false-positive-match unrelated code. */
private const val MIN_STEM_LENGTH_FOR_HOVER = 4

/** Minimum time between hints on the same editor, so rapid mouse movement across many matching lines doesn't spam popups. */
private const val MIN_MS_BETWEEN_HINTS = 1500L

/**
 * Shows a lightweight hover hint when the cursor rests over a source line
 * that mentions a known asset's file stem — an approximation of VS Code's
 * `AnimoriaHoverProvider`.
 *
 * ## Why not `LineMarkerProvider` / `ExternalAnnotator`
 * Both of IntelliJ's documented hover-adjacent APIs (`LineMarkerProvider`,
 * `ExternalAnnotator`) operate on the PSI tree, which only has fine-grained
 * per-token structure for languages IntelliJ (or an installed plugin)
 * actually parses. Animoria's usage-scan targets are JS/TS, Swift, Kotlin,
 * Dart, Vue, Python — outside Kotlin/Java, most of these are only parsed as
 * plain text without their (separately licensed or bundled) language
 * plugin, collapsing to a single leaf per file and making PSI-based
 * per-line detection unreliable. An `EditorMouseMotionListener` operates on
 * raw document text instead, so it works uniformly across every file type
 * open in the editor — the same "any language, plain substring" model VS
 * Code's regex-based hover already uses.
 *
 * ## Approximation, not authoritative matching
 * This performs a simple stem substring check, not `@animoria/core`'s full
 * semantic pattern engine (`reference-patterns.ts`) — reimplementing that
 * matching logic in Kotlin would violate the "no business logic in
 * Kotlin" architecture decision. This is a best-effort visual cue; the
 * Gallery's usage-reference list (backed by the daemon's `UsageScanner`)
 * remains the authoritative source of truth.
 */
class AnimoriaEditorHoverListener : EditorFactoryListener {
    override fun editorCreated(event: EditorFactoryEvent) {
        val editor = event.editor
        val project = editor.project ?: return

        // Only source files backed by a real VirtualFile — excludes diff
        // viewers, the commit message box, consoles, and other synthetic
        // editors the platform also fires this listener for.
        if (FileDocumentManager.getInstance().getFile(editor.document) == null) return

        var lastHintLine = -1
        var lastHintAtMs = 0L

        editor.addEditorMouseMotionListener(
            object : EditorMouseMotionListener {
                override fun mouseMoved(e: EditorMouseEvent) {
                    val visualPosition = e.visualPosition
                    val logicalPosition = editor.visualToLogicalPosition(visualPosition)
                    val line = logicalPosition.line

                    if (line == lastHintLine) return
                    if (line < 0 || line >= editor.document.lineCount) return

                    val now = System.currentTimeMillis()
                    if (now - lastHintAtMs < MIN_MS_BETWEEN_HINTS) return

                    val lineStart = editor.document.getLineStartOffset(line)
                    val lineEnd = editor.document.getLineEndOffset(line)
                    val lineText = editor.document.getText(com.intellij.openapi.util.TextRange(lineStart, lineEnd))

                    val assets = project.getService(CoreProcessManager::class.java).getCachedAssets()
                    val matched =
                        assets.firstOrNull { asset ->
                            asset.stem.length >= MIN_STEM_LENGTH_FOR_HOVER && lineText.contains(asset.stem)
                        } ?: return

                    lastHintLine = line
                    lastHintAtMs = now
                    showHint(editor, matched)
                }
            },
        )
    }

    private fun showHint(
        editor: Editor,
        asset: JetBrainsAsset,
    ) {
        val text = "Animoria: ${asset.name} (${asset.format.uppercase()}, ${formatBytes(asset.sizeBytes)})"
        HintManager.getInstance().showInformationHint(editor, text)
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", bytes / 1024.0)
        return String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
    }
}
