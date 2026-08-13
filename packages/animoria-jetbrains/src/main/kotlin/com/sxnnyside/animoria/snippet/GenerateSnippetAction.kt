package com.sxnnyside.animoria.snippet

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.wm.WindowManager
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.JetBrainsAsset
import com.sxnnyside.animoria.backend.SnippetData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import java.awt.datatransfer.StringSelection

/**
 * Generates a paste-ready framework integration snippet for an asset.
 *
 * Business logic (which frameworks are offered, import path resolution,
 * install hints) lives entirely in `@animoria/core`'s `integrationRegistry`
 * (`generateSnippet` daemon command) — this object only presents the
 * resulting choices and copies the selection to the clipboard. Mirrors
 * VS Code's `generateSnippet()` command (`showQuickPick` + clipboard copy).
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
                val response =
                    processManager.sendCommand(
                        "generateSnippet",
                        Json.parseToJsonElement("""{"assetPath":"${asset.path}"}""").jsonObject,
                    )
                val result = Json.decodeFromJsonElement<com.sxnnyside.animoria.backend.SnippetResultData>(response)

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
        JBPopupFactory.getInstance()
            .createPopupChooserBuilder(snippets)
            .setTitle("Copy Integration Snippet")
            .setItemChosenCallback { chosen -> copyToClipboard(project, chosen) }
            .setRenderer { _, value, _, _, _ ->
                javax.swing.JLabel(value.label)
            }
            .createPopup()
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
    }
}
