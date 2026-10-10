package com.sxnnyside.animoria.snippet

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.wm.WindowManager
import com.intellij.ui.components.JBLabel
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.SnippetData
import com.sxnnyside.animoria.backend.SnippetResultData
import com.sxnnyside.animoria.backend.animoriaJson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.put
import java.awt.datatransfer.StringSelection
import javax.swing.BorderFactory

/**
 * Action that requests code integration snippets from the native daemon and presents
 * a chooser popup to copy the snippet to the clipboard.
 */
object GenerateSnippetAction {
    /** Requests snippet choices for [asset] from the daemon and lets the user pick one to copy. */
    fun execute(
        project: Project,
        asset: JetBrainsAsset,
    ) {
        val processManager = project.getService(CoreProcessManager::class.java)

        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
            try {
                val params =
                    buildJsonObject {
                        put("assetPath", asset.path)
                        project.basePath?.let { put("workspacePath", it) }
                    }
                val response = processManager.sendCommand("generateSnippet", params)
                val result = animoriaJson.decodeFromJsonElement<SnippetResultData>(response)

                if (result.error != null || result.results.isEmpty()) {
                    ApplicationManager.getApplication().invokeLater {
                        com.sxnnyside.animoria.logging.AnimoriaLogger.warn(
                            "Animoria: No integration snippets available for ${asset.name}",
                        )
                    }
                    return@launch
                }

                ApplicationManager.getApplication().invokeLater {
                    showSnippetPicker(project, result.results)
                }
            } catch (e: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error(
                    "Animoria: Failed to generate snippet for ${asset.name}",
                    e,
                )
            }
        }
    }

    private fun showSnippetPicker(
        project: Project,
        snippets: List<SnippetData>,
    ) {
        JBPopupFactory
            .getInstance()
            .createPopupChooserBuilder(snippets)
            .setTitle("Copy Integration Snippet")
            .setItemChosenCallback { chosen -> copyToClipboard(project, chosen) }
            .setRenderer { _, value, _, _, _ ->
                val text = if (value.language.isNotEmpty()) "${value.label} [${value.language}]" else value.label
                JBLabel(text).apply {
                    border = BorderFactory.createEmptyBorder(4, 8, 4, 8)
                }
            }.createPopup()
            .showInFocusCenter()
    }

    private fun copyToClipboard(
        project: Project,
        snippet: SnippetData,
    ) {
        val fullText =
            buildString {
                snippet.imports?.let { append(it).append("\n\n") }
                append(snippet.code)
            }
        CopyPasteManager.getInstance().setContents(StringSelection(fullText))

        val statusBar = WindowManager.getInstance().getStatusBar(project)
        statusBar?.info = "Animoria: ${snippet.label} snippet copied to clipboard"

        NotificationGroupManager
            .getInstance()
            .getNotificationGroup("Animoria")
            ?.createNotification(
                "Animoria: Snippet Copied",
                "Copied ${snippet.label} snippet to clipboard",
                NotificationType.INFORMATION,
            )?.notify(project)
    }
}
