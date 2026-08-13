package com.sxnnyside.animoria.governance

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.GovernanceReportExportData
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.put

/**
 * Saves the current governance report to disk as Markdown or JSON.
 * Registered on the governance section's context menu. Mirrors VS Code's
 * `exportGovernanceReport()` (save dialog + `workspace.fs.writeFile`).
 */
class ExportGovernanceReportAction(private val project: Project) :
    AnAction("Export Governance Report", "Save the governance report as Markdown or JSON", AllIcons.Actions.MenuSaveall) {
    override fun actionPerformed(e: AnActionEvent) {
        val descriptor =
            FileSaverDescriptor(
                "Export Governance Report",
                "Choose a location and format",
                "md",
                "json",
            )
        val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
        val wrapper = dialog.save(null as com.intellij.openapi.vfs.VirtualFile?, "animoria-governance-report.md") ?: return
        val targetFile = wrapper.file

        val format = if (targetFile.extension.lowercase() == "json") "json" else "markdown"
        val processManager = project.getService(CoreProcessManager::class.java)

        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
            try {
                val response =
                    processManager.sendCommand(
                        // `exportGovernanceReport` is not a protocol method; `exportReport` is.
                        "exportReport",
                        buildJsonObject { put("format", format) },
                    )
                val result = Json.decodeFromJsonElement<GovernanceReportExportData>(response)

                ApplicationManager.getApplication().invokeLater {
                    if (result.error != null) {
                        Messages.showWarningDialog(project, result.error, "Export Governance Report")
                        return@invokeLater
                    }
                    targetFile.writeText(result.content, Charsets.UTF_8)
                    Messages.showInfoMessage(project, "Report exported to ${targetFile.name}", "Export Complete")
                }
            } catch (ex: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error("Animoria: Failed to export governance report", ex)
            }
        }
    }
}
