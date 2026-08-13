package com.sxnnyside.animoria.ui

import com.intellij.ide.BrowserUtil
import com.intellij.openapi.project.Project
import com.intellij.ui.components.ActionLink
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.JBUI
import com.sxnnyside.animoria.actions.AnimoriaActionHost
import java.awt.BorderLayout
import java.awt.Component
import javax.swing.BoxLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * D-09: the JCEF-unavailable state, as one actionable panel.
 *
 * ## Why this is not a second UI
 * The plugin previously carried a ~1,700-line Swing stack as a "fallback" — a
 * complete second implementation of the gallery, preview, cleanup and duplicate
 * screens. It was the branch that hid every action from every user, and it was the
 * only branch with a test.
 *
 * The honest replacement is not a smaller second UI. It is **one screen that says
 * what is wrong, how to fix it, and offers the one operation that does not need a
 * browser at all**: run the analysis and open the report in the editor. A developer
 * whose IDE has JCEF disabled is not served by a degraded gallery; they are served
 * by knowing why they cannot see the real one.
 *
 * ## Why the report button is here
 * Governance is the product's actual value, and the report is a text document the
 * platform can already display. Offering it means the plugin is useful even in this
 * state, rather than being a wall of apology.
 */
class AnimoriaDegradedPanel(private val project: Project) {
    val component: JComponent = JPanel(BorderLayout())

    init {
        val body = JPanel()
        body.layout = BoxLayout(body, BoxLayout.Y_AXIS)
        body.border = JBUI.Borders.empty(24)

        val heading = JBLabel("Animoria needs the IDE's embedded browser")
        heading.font = heading.font.deriveFont(heading.font.size2D + 3f)
        heading.alignmentX = Component.LEFT_ALIGNMENT
        body.add(heading)
        body.add(
            JBUI.Borders.emptyTop(8).let {
                JPanel().apply {
                    border = it
                    isOpaque = false
                }
            },
        )

        val explanation =
            JBLabel(
                "<html><body style='width: 420px'>" +
                    "Animoria's asset gallery, previews and cleanup review are rendered with JCEF, " +
                    "the browser component bundled with this IDE. It is not available in this " +
                    "installation.<br><br>" +
                    "Enable it in <b>Help → Find Action → Choose Boot Java Runtime for the IDE</b> " +
                    "and select a runtime <b>with JCEF</b>, then restart." +
                    "</body></html>",
            )
        explanation.alignmentX = Component.LEFT_ALIGNMENT
        body.add(explanation)

        val runReport = JButton("Run analysis and open the report")
        runReport.alignmentX = Component.LEFT_ALIGNMENT
        runReport.addActionListener {
            // Uses no webview: the report opens as an editor document. This is the
            // whole reason the degraded state is a supported state rather than an
            // error screen.
            AnimoriaActionHost.of(project).openGovernanceReport()
        }
        body.add(
            JBUI.Borders.emptyTop(16).let {
                JPanel().apply {
                    border = it
                    isOpaque = false
                }
            },
        )
        body.add(runReport)

        // `ActionLink`, not `LinkLabel`: the latter is deprecated for plugin use, and a
        // deprecated API is the first step towards an unsupported one.
        val docs =
            ActionLink("Why does Animoria need JCEF?") {
                BrowserUtil.browse(
                    "https://github.com/sxnnyside-project/animoria/blob/main/docs/ARCHITECTURE.md",
                )
            }
        docs.alignmentX = Component.LEFT_ALIGNMENT
        body.add(
            JBUI.Borders.emptyTop(12).let {
                JPanel().apply {
                    border = it
                    isOpaque = false
                }
            },
        )
        body.add(docs)

        component.add(body, BorderLayout.NORTH)
    }
}
