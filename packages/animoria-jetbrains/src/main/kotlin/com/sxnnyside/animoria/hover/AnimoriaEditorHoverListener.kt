package com.sxnnyside.animoria.hover

import com.intellij.codeInsight.hint.HintManager
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.editor.event.EditorMouseEvent
import com.intellij.openapi.editor.event.EditorMouseMotionListener
import com.intellij.openapi.fileEditor.FileDocumentManager

/** Minimum time between hints on the same editor, so a sweeping pointer cannot spam popups. */
private const val MIN_MS_BETWEEN_HINTS = 1500L

/**
 * Shows what Animoria knows about the line under the cursor.
 *
 * ## What changed from the implementation this replaces
 * The listener of the same name did the *matching itself*: a substring test of asset
 * stems against raw document text, with a four-character minimum to suppress the
 * false positives that approach inevitably produces. Its own documentation conceded
 * it was "an approximation, not authoritative matching", and that reimplementing
 * `reference-patterns.ts` in Kotlin would violate the architecture.
 *
 * It was deleted in the shared-UI migration with nothing in its place, so VS Code
 * kept an editor hover and JetBrains lost one — the same product answering the same
 * question in one IDE and staying silent in the other.
 *
 * This one decides nothing. It asks [AnimoriaUsageHoverProvider], which reads Core's
 * reference index, and renders the answer. There is no stem length threshold here
 * because there are no false positives to suppress: a line either is a reference Core
 * established or it is not.
 *
 * ## Why still an `EditorMouseMotionListener`
 * `LineMarkerProvider` and `ExternalAnnotator` work on the PSI tree, which has
 * per-token structure only for languages the IDE parses. Animoria's scan covers
 * JS/TS, Swift, Kotlin, Dart, Vue and Python; outside the JVM languages most of those
 * collapse to a single leaf without their own plugin, and a PSI-based hover would
 * work in Kotlin files and nowhere else. A document line is available everywhere,
 * which is also the model VS Code's provider uses.
 */
class AnimoriaEditorHoverListener : EditorFactoryListener {
    override fun editorCreated(event: EditorFactoryEvent) {
        val editor = event.editor
        val project = editor.project ?: return

        // Only editors backed by a real file. The platform fires this listener for
        // diff viewers, the commit message box and consoles too, none of which have a
        // path Core could have scanned.
        if (FileDocumentManager.getInstance().getFile(editor.document) == null) return

        val hovers = AnimoriaUsageHoverProvider(project)
        var lastHintLine = -1
        var lastHintAtMs = 0L

        editor.addEditorMouseMotionListener(
            object : EditorMouseMotionListener {
                override fun mouseMoved(e: EditorMouseEvent) {
                    val visualPosition = editor.xyToLogicalPosition(e.mouseEvent.point)
                    val line = visualPosition.line
                    if (line < 0 || line >= editor.document.lineCount) return

                    val now = System.currentTimeMillis()
                    if (line == lastHintLine && now - lastHintAtMs < MIN_MS_BETWEEN_HINTS) return

                    val hit = hovers.hitAt(editor, line) ?: return

                    lastHintLine = line
                    lastHintAtMs = now
                    HintManager.getInstance().showInformationHint(editor, hovers.describe(hit))
                }
            },
        )
    }
}
