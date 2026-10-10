package com.sxnnyside.animoria.gutter

import com.intellij.codeInsight.daemon.GutterIconNavigationHandler
import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.codeInsight.daemon.LineMarkerProvider
import com.intellij.icons.AllIcons
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiElement
import com.intellij.util.Function
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows

/**
 * Line marker provider rendering an asset indicator in the editor gutter on lines
 * referencing an Animoria visual asset.
 *
 * Clicking the gutter marker focuses the asset preview inside the Animoria tool window.
 */
class AnimoriaLineMarkerProvider : LineMarkerProvider {
    override fun getLineMarkerInfo(element: PsiElement): LineMarkerInfo<*>? {
        // Fast exit: only attach to leaf PSI elements (identifiers/tokens)
        if (element.firstChild != null) return null

        val project = element.project
        val containingFile = element.containingFile ?: return null
        val virtualFile = containingFile.virtualFile ?: return null

        val holder = AnimoriaAnalysisHolder.of(project)
        val document = PsiDocumentManager.getInstance(project).getDocument(containingFile) ?: return null
        val offset = element.textRange.startOffset
        if (offset < 0 || offset >= document.textLength) return null

        val lineNumber = document.getLineNumber(offset)
        val lineStart = document.getLineStartOffset(lineNumber)

        // Only attach to the first non-whitespace element on the line to avoid duplicate markers
        val textBefore = document.charsSequence.subSequence(lineStart, offset)
        if (textBefore.any { !it.isWhitespace() }) return null

        // Animoria usage reference line numbers are 1-based
        val reference = holder.referenceInFileAtLine(virtualFile.path, lineNumber + 1) ?: return null
        val asset = holder.assetForPath(reference.assetPath)

        val tooltip =
            Function<PsiElement, String> {
                val assetName = asset?.let { "${it.stem}.${it.format}" } ?: "Visual asset"
                "Animoria: $assetName (${reference.reference.kind}) — Click to preview in Animoria"
            }

        val navHandler =
            GutterIconNavigationHandler<PsiElement> { _, _ ->
                AnimoriaToolWindows.show(project, "Preview")
                AnimoriaSharedUiPanel.of(project, "inspector")?.focus(
                    AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = reference.assetPath),
                )
            }

        return LineMarkerInfo(
            element,
            element.textRange,
            AllIcons.FileTypes.Image,
            tooltip,
            navHandler,
            GutterIconRenderer.Alignment.LEFT,
            { "Animoria Asset Reference" },
        )
    }
}
