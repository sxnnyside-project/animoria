package com.sxnnyside.animoria.editor

import com.intellij.icons.AllIcons
import com.intellij.openapi.Disposable
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorLocation
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.FileEditorStateLevel
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.JBUI
import com.sxnnyside.animoria.actions.ShowInGalleryContextAction
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.snippet.GenerateSnippetAction
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import com.sxnnyside.animoria.ui.AnimoriaToolWindows
import java.awt.BorderLayout
import java.awt.Cursor
import java.awt.FlowLayout
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * FileEditorProvider registering custom visual editor for dotLottie (.lottie) and Rive (.riv) assets.
 */
class AnimoriaAssetEditorProvider :
    FileEditorProvider,
    DumbAware {
    override fun accept(
        project: Project,
        file: VirtualFile,
    ): Boolean {
        val ext = file.extension?.lowercase() ?: return false
        return ext in SUPPORTED_EXTENSIONS
    }

    override fun createEditor(
        project: Project,
        file: VirtualFile,
    ): FileEditor = AnimoriaAssetFileEditor(project, file)

    override fun getEditorTypeId(): String = EDITOR_TYPE_ID

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR

    companion object {
        const val EDITOR_TYPE_ID = "animoria-asset-editor"
        private val SUPPORTED_EXTENSIONS = setOf("lottie", "riv")
    }
}

/**
 * Dedicated visual file editor tab for animation asset files.
 */
class AnimoriaAssetFileEditor(
    private val project: Project,
    private val file: VirtualFile,
) : UserDataHolderBase(),
    FileEditor,
    DumbAware,
    Disposable {
    private val changeSupport = PropertyChangeSupport(this)
    private val rootComponent = JPanel(BorderLayout())
    private var sharedUiPanel: AnimoriaSharedUiPanel? = null

    init {
        buildUi()
    }

    private fun buildUi() {
        val asset = ShowInGalleryContextAction.resolveAsset(project, file)
        rootComponent.add(createHeader(asset), BorderLayout.NORTH)

        val uiPanel = AnimoriaSharedUiPanel(project, this, surface = "asset-editor-${file.name}")
        sharedUiPanel = uiPanel
        rootComponent.add(uiPanel.component, BorderLayout.CENTER)

        if (asset != null) {
            uiPanel.focus(AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = asset.path))
        }
    }

    private fun createHeader(asset: JetBrainsAsset?): JPanel {
        val header =
            JPanel(BorderLayout()).apply {
                border =
                    JBUI.Borders.compound(
                        JBUI.Borders.customLine(JBColor.border(), 0, 0, 1, 0),
                        JBUI.Borders.empty(8, 12),
                    )
            }

        val leftInfo = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0))
        val titleLabel =
            JBLabel(file.name).apply {
                font = font.deriveFont(java.awt.Font.BOLD, font.size2D + 1f)
                icon = AllIcons.Actions.Preview
            }
        val metaLabel =
            JBLabel("${file.extension?.uppercase()} · ${formatBytes(file.length)}").apply {
                foreground = JBColor.GRAY
            }

        leftInfo.add(titleLabel)
        leftInfo.add(metaLabel)

        val holder = AnimoriaAnalysisHolder.of(project)
        val diagnostics = asset?.let { holder.diagnosticsFor(it.path) }.orEmpty()

        if (diagnostics.isNotEmpty()) {
            val statusLabel =
                JBLabel("[${diagnostics.size} finding(s)]").apply {
                    foreground = JBColor.RED
                    toolTipText = diagnostics.joinToString("\n") { "${it.ruleId}: ${it.message}" }
                }
            leftInfo.add(statusLabel)
        }

        val rightActions = JPanel(FlowLayout(FlowLayout.RIGHT, 6, 0))
        val galleryBtn =
            JButton("Show in Gallery", AllIcons.Actions.Preview).apply {
                cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                addActionListener {
                    AnimoriaToolWindows.show(project, "Preview")
                    if (asset != null) {
                        AnimoriaSharedUiPanel.of(project, "preview")?.focus(
                            AnimoriaSharedUiPanel.Focus(tab = "assets", assetPath = asset.path),
                        )
                    }
                }
            }
        rightActions.add(galleryBtn)

        if (asset != null) {
            val snippetBtn =
                JButton("Copy Snippet", AllIcons.Actions.Copy).apply {
                    cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                    addActionListener {
                        GenerateSnippetAction.execute(project, asset)
                    }
                }
            rightActions.add(snippetBtn)
        }

        header.add(leftInfo, BorderLayout.WEST)
        header.add(rightActions, BorderLayout.EAST)
        return header
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", kb)
        val mb = kb / 1024.0
        return String.format(java.util.Locale.ROOT, "%.2f MB", mb)
    }

    override fun getComponent(): JComponent = rootComponent

    override fun getPreferredFocusedComponent(): JComponent? = rootComponent

    override fun getName(): String = "Animoria Asset"

    override fun setState(state: FileEditorState) {
        // State retention is handled by embedded webview
    }

    override fun getState(level: FileEditorStateLevel): FileEditorState = FileEditorState { _, _ -> true }

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = file.isValid

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.addPropertyChangeListener(listener)
    }

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
        changeSupport.removePropertyChangeListener(listener)
    }

    override fun getCurrentLocation(): FileEditorLocation? = null

    override fun getFile(): VirtualFile = file

    override fun dispose() {
        sharedUiPanel = null
    }
}
