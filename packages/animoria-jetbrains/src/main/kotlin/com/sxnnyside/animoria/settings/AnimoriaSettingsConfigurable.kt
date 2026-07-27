package com.sxnnyside.animoria.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JSpinner
import javax.swing.SpinnerNumberModel

/**
 * IntelliJ Settings → Tools → Animoria configuration panel.
 *
 * Mirrors the VS Code `animoria.*` configuration entries:
 * - Thumbnails toggle → `animoria.enableThumbnails`
 * - Overused threshold → `animoria.governance.overusedThreshold`
 *
 * Uses `FormBuilder` (stable public IntelliJ Platform API) for the layout —
 * identical to how other JetBrains first-party settings panels are built.
 */
class AnimoriaSettingsConfigurable(private val project: Project) : Configurable {
    private var panel: JPanel? = null
    private var thumbnailsCheckBox: JBCheckBox? = null
    private var overusedSpinner: JSpinner? = null

    override fun getDisplayName(): String = "Animoria"

    override fun createComponent(): JComponent {
        val checkBox = JBCheckBox("Generate thumbnail previews for animated assets in the gallery")
        thumbnailsCheckBox = checkBox

        val spinner = JSpinner(SpinnerNumberModel(10, 1, 1000, 1))
        overusedSpinner = spinner

        val form =
            FormBuilder.createFormBuilder()
                .addComponent(checkBox)
                .addLabeledComponent(
                    JBLabel("Overused asset threshold (references):"),
                    spinner,
                )
                .addComponentFillVertically(JPanel(), 0)
                .panel

        panel = form
        reset()
        return form
    }

    override fun isModified(): Boolean {
        val settings = AnimoriaSettings.getInstance(project)
        return thumbnailsCheckBox?.isSelected != settings.enableThumbnails ||
            overusedSpinner?.value as? Int != settings.overusedThreshold
    }

    override fun apply() {
        val settings = AnimoriaSettings.getInstance(project)
        settings.state.enableThumbnails = thumbnailsCheckBox?.isSelected ?: true
        settings.state.overusedThreshold = overusedSpinner?.value as? Int ?: 10
    }

    override fun reset() {
        val settings = AnimoriaSettings.getInstance(project)
        thumbnailsCheckBox?.isSelected = settings.enableThumbnails
        overusedSpinner?.value = settings.overusedThreshold
    }

    override fun disposeUIResources() {
        panel = null
        thumbnailsCheckBox = null
        overusedSpinner = null
    }
}
