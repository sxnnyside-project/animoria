package com.sxnnyside.animoria.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * IntelliJ Settings → Tools → Animoria configuration panel.
 *
 * Mirrors the VS Code `animoria.*` configuration entries:
 * - Thumbnails toggle → `animoria.enableThumbnails`
 *
 * Uses `FormBuilder` (stable public IntelliJ Platform API) for the layout —
 * identical to how other JetBrains first-party settings panels are built.
 */
class AnimoriaSettingsConfigurable(private val project: Project) : Configurable {
    private var panel: JPanel? = null
    private var thumbnailsCheckBox: JBCheckBox? = null

    override fun getDisplayName(): String = "Animoria"

    override fun createComponent(): JComponent {
        val checkBox = JBCheckBox("Generate thumbnail previews for animated assets in the gallery")
        thumbnailsCheckBox = checkBox

        val form =
            FormBuilder.createFormBuilder()
                .addComponent(checkBox)
                .addComponentFillVertically(JPanel(), 0)
                .panel

        panel = form
        reset()
        return form
    }

    override fun isModified(): Boolean {
        val settings = AnimoriaSettings.getInstance(project)
        return thumbnailsCheckBox?.isSelected != settings.enableThumbnails
    }

    override fun apply() {
        val settings = AnimoriaSettings.getInstance(project)
        settings.state.enableThumbnails = thumbnailsCheckBox?.isSelected ?: true
    }

    override fun reset() {
        val settings = AnimoriaSettings.getInstance(project)
        thumbnailsCheckBox?.isSelected = settings.enableThumbnails
    }

    override fun disposeUIResources() {
        panel = null
        thumbnailsCheckBox = null
    }
}
