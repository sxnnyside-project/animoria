package com.sxnnyside.animoria.ui

import com.intellij.icons.AllIcons
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.ui.ClickListener
import com.intellij.util.ui.JBUI
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import java.awt.Cursor
import java.awt.event.MouseEvent
import javax.swing.JComponent
import javax.swing.JLabel

/**
 * Factory for creating the Animoria status bar widget in IntelliJ IDEs.
 */
class AnimoriaStatusBarWidgetFactory : StatusBarWidgetFactory {
    override fun getId(): String = AnimoriaStatusBarWidget.ID

    override fun getDisplayName(): String = "Animoria"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget = AnimoriaStatusBarWidget(project)

    override fun disposeWidget(widget: StatusBarWidget) {
        Disposer.dispose(widget)
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}

/**
 * Custom status bar widget displaying Animoria governance health score and findings count.
 * Clicking the widget reveals the Animoria Tool Window.
 */
class AnimoriaStatusBarWidget(
    private val project: Project,
) : AnimoriaStatusBarWidgetBase() {
    private val label =
        JLabel("Animoria").apply {
            icon = AllIcons.Actions.Preview
            border = JBUI.Borders.empty(0, 4)
            cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        }

    override fun ID(): String = ID

    override fun getComponent(): JComponent = label

    override fun install(statusBar: StatusBar) {
        object : ClickListener() {
            override fun onClick(
                event: MouseEvent,
                clickCount: Int,
            ): Boolean {
                AnimoriaToolWindows.show(project, "Preview")
                return true
            }
        }.installOn(label)

        update()
    }

    /** Updates the widget presentation using the latest synchronous analysis in AnimoriaAnalysisHolder. */
    fun update() {
        if (project.isDisposed) return
        val analysis = AnimoriaAnalysisHolder.of(project).current()
        if (analysis == null) {
            label.text = "Animoria: Ready"
            label.toolTipText = "Animoria visual asset governance is active"
            return
        }

        val score = analysis.healthScore?.score ?: 100.0
        val findings = analysis.diagnostics.size
        label.text =
            if (findings > 0) {
                "Animoria: ${score.toInt()}% ($findings)"
            } else {
                "Animoria: ${score.toInt()}%"
            }
        label.toolTipText =
            "Animoria Health Score: ${score.toInt()}%\n" +
            "$findings governance finding(s) detected\n" +
            "Click to open Animoria"
    }

    override fun dispose() {
        // No resources to release beyond Disposer lifecycle
    }

    companion object {
        const val ID = "AnimoriaStatusBar"
    }
}
