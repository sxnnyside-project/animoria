package com.sxnnyside.animoria.duplicates

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.ui.components.JBLabel
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.ui.GovernanceIssueNode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import javax.swing.BoxLayout
import javax.swing.ButtonGroup
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JRadioButton

/**
 * Presents one duplicate group (a governance-flagged asset and the assets it
 * is byte-identical to) and lets the developer pick which copy to keep.
 *
 * All resolution logic (which file is deleted, moving the rest to
 * `.animoria/trash/`) happens in the daemon via the `resolveDuplicates`
 * command — this dialog only collects the developer's canonical-asset
 * choice. Mirrors VS Code's `AnimoriaDuplicateResolver`.
 */
class DuplicateResolverDialog(
    private val project: Project,
    private val node: GovernanceIssueNode,
) : DialogWrapper(project, true) {
    private val candidatePaths: List<String> = listOf(node.asset.path) + node.duplicateOf
    private val radioButtons = mutableMapOf<String, JRadioButton>()

    init {
        title = "Resolve Duplicate: ${node.asset.stem}"
        setOKButtonText("Resolve Duplicates")
        init()
    }

    override fun createCenterPanel(): JComponent {
        val panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)
        panel.add(JBLabel("Choose which copy to keep. The others will be moved to .animoria/trash/."))
        panel.add(javax.swing.Box.createVerticalStrut(8))

        val group = ButtonGroup()
        candidatePaths.forEachIndexed { index, path ->
            val radio = JRadioButton(path, index == 0)
            group.add(radio)
            radioButtons[path] = radio
            panel.add(radio)
        }

        panel.border = javax.swing.BorderFactory.createEmptyBorder(12, 12, 12, 12)
        return panel
    }

    override fun doOKAction() {
        val keepPath = radioButtons.entries.find { it.value.isSelected }?.key
        if (keepPath == null) {
            Messages.showErrorDialog(project, "Select a copy to keep.", "Resolve Duplicate")
            return
        }

        val removePaths = candidatePaths.filter { it != keepPath }
        val confirmed =
            Messages.showYesNoDialog(
                project,
                "Move ${removePaths.size} duplicate file(s) to .animoria/trash/? " +
                    "\"$keepPath\" will be kept as the canonical copy.",
                "Resolve Duplicates",
                "Resolve",
                "Cancel",
                Messages.getQuestionIcon(),
            )
        if (confirmed != Messages.YES) return

        val processManager = project.getService(CoreProcessManager::class.java)

        GlobalScope.launch(Dispatchers.IO) {
            try {
                val removePathsJson = removePaths.joinToString(",") { "\"${it.replace("\\", "\\\\")}\"" }
                val response =
                    processManager.sendCommand(
                        "resolveDuplicates",
                        Json.parseToJsonElement(
                            """{"keepPath":"${keepPath.replace("\\", "\\\\")}","removePaths":[$removePathsJson]}""",
                        ).jsonObject,
                    )
                val result = Json.decodeFromJsonElement<com.sxnnyside.animoria.backend.DuplicateResolutionResultData>(response)

                ApplicationManager.getApplication().invokeLater {
                    if (result.error != null) {
                        Messages.showErrorDialog(project, result.error, "Resolve Duplicate")
                    } else {
                        Messages.showInfoMessage(
                            project,
                            "Removed ${result.removedAssetPaths.size} duplicate(s). Moved to ${result.trashLocation ?: "trash"}.",
                            "Duplicate Resolved",
                        )
                    }
                }
            } catch (e: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error("Animoria: Failed to resolve duplicates", e)
            }
        }

        super.doOKAction()
    }
}
