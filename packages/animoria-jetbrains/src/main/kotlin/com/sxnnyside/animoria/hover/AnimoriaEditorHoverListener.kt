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
 * Listens to editor mouse motion events to display Animoria asset hover tooltips.
 *
 * Attaches a mouse motion listener to document-backed editors, delegating hover resolution
 * to {@link AnimoriaUsageHoverProvider} and debouncing popup triggers.
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
