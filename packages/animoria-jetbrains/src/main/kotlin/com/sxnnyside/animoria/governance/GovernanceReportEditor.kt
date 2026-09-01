package com.sxnnyside.animoria.governance

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.GovernanceReportExportData
import com.sxnnyside.animoria.logging.AnimoriaLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.put
import java.io.File

/**
 * Opens the current governance report as a read-only Markdown document in the editor.
 * Content is formatted natively by the core daemon via the `exportReport` command.
 */
object GovernanceReportEditor {
    /**
     * Writes the report to a read-only file under the IDE system directory and opens it in the editor.
     * Uses standard public IntelliJ Platform filesystem APIs (`PathManager.getSystemPath()`).
     */
    private fun openReport(
        project: Project,
        content: String,
    ) {
        val directory = File(PathManager.getSystemPath(), "animoria/reports/${project.locationHash}")
        directory.mkdirs()

        val file = File(directory, "Animoria Governance Report.md")
        file.writeText(content)
        file.setWritable(false)

        val virtualFile =
            LocalFileSystem.getInstance().refreshAndFindFileByIoFile(file) ?: run {
                AnimoriaLogger.warn("Animoria: the governance report could not be opened from ${file.absolutePath}")
                return
            }
        virtualFile.refresh(false, false)
        FileEditorManager.getInstance(project).openFile(virtualFile, true)
    }

    fun open(project: Project) {
        val processManager = project.getService(CoreProcessManager::class.java)
        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
            try {
                val response =
                    processManager.sendCommand(
                        "exportReport",
                        buildJsonObject { put("format", "markdown") },
                    )
                val result = Json.decodeFromJsonElement<GovernanceReportExportData>(response)

                ApplicationManager.getApplication().invokeLater {
                    if (result.error != null) {
                        Messages.showWarningDialog(project, result.error, "Governance Report")
                        return@invokeLater
                    }
                    openReport(project, result.content)
                }
            } catch (e: Exception) {
                AnimoriaLogger.error("Animoria: Failed to open governance report", e)
            }
        }
    }
}
