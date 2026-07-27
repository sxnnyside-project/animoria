package com.sxnnyside.animoria.cleanup

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.ui.ScrollPaneFactory
import com.intellij.ui.components.JBLabel
import com.sxnnyside.animoria.backend.CleanupCandidateData
import com.sxnnyside.animoria.backend.CleanupProposalData
import com.sxnnyside.animoria.backend.CoreProcessManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import java.awt.BorderLayout
import javax.swing.BoxLayout
import javax.swing.JCheckBox
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * Multi-step cleanup review: fetches a governance-driven proposal from the
 * daemon (`buildCleanupProposal`), lets the developer approve or exclude
 * individual candidates, then executes the approved subset (`executeCleanup`).
 *
 * All candidate selection (orphan/duplicate detection, size estimates,
 * health-score projection) is computed by `@animoria/core` in the daemon;
 * this dialog is presentation and developer confirmation only. Mirrors
 * VS Code's Bulk Cleanup Review panel.
 */
class CleanupReviewDialog(private val project: Project) : DialogWrapper(project, true) {
    private val contentPanel = JPanel(BorderLayout())
    private val checkboxes = mutableMapOf<String, JCheckBox>()
    private var proposal: CleanupProposalData? = null

    init {
        title = "Review Cleanup Opportunities"
        setOKButtonText("Execute Cleanup")
        isOKActionEnabled = false
        init()
        loadProposal()
    }

    override fun createCenterPanel(): JComponent {
        contentPanel.preferredSize = java.awt.Dimension(560, 420)
        contentPanel.add(JBLabel("Loading cleanup proposal…"), BorderLayout.CENTER)
        return contentPanel
    }

    private fun loadProposal() {
        val processManager = project.getService(CoreProcessManager::class.java)
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val response = processManager.sendCommand("buildCleanupProposal", buildJsonObject {})
                val result = Json.decodeFromJsonElement<CleanupProposalData>(response)
                ApplicationManager.getApplication().invokeLater { renderProposal(result) }
            } catch (e: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error("Animoria: Failed to build cleanup proposal", e)
                ApplicationManager.getApplication().invokeLater {
                    contentPanel.removeAll()
                    contentPanel.add(JBLabel("Failed to load cleanup proposal."), BorderLayout.CENTER)
                    contentPanel.revalidate()
                    contentPanel.repaint()
                }
            }
        }
    }

    private fun renderProposal(result: CleanupProposalData) {
        proposal = result
        contentPanel.removeAll()

        if (result.candidates.isEmpty()) {
            contentPanel.add(JBLabel("No cleanup opportunities found. Your workspace is clean."), BorderLayout.CENTER)
            contentPanel.revalidate()
            contentPanel.repaint()
            return
        }

        val summary =
            JBLabel(
                "<html>${result.candidates.size} candidate(s) &middot; " +
                    "${formatBytes(result.totalSizeBytes)} reclaimable &middot; " +
                    "est. health +${result.estimatedHealthScoreDelta}</html>",
            )

        val listPanel = JPanel()
        listPanel.layout = BoxLayout(listPanel, BoxLayout.Y_AXIS)

        result.candidates.forEach { candidate ->
            val checkBox = JCheckBox(describeCandidate(candidate), true)
            checkboxes[candidate.assetPath] = checkBox
            listPanel.add(checkBox)
        }

        contentPanel.add(summary, BorderLayout.NORTH)
        contentPanel.add(ScrollPaneFactory.createScrollPane(listPanel), BorderLayout.CENTER)
        contentPanel.revalidate()
        contentPanel.repaint()

        isOKActionEnabled = true
    }

    private fun describeCandidate(candidate: CleanupCandidateData): String {
        val reasons = candidate.reasons.joinToString(", ")
        return "${candidate.assetName} — $reasons (${formatBytes(candidate.sizeBytes)})"
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        if (bytes < 1024 * 1024) return String.format(java.util.Locale.ROOT, "%.1f KB", bytes / 1024.0)
        return String.format(java.util.Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0))
    }

    override fun doOKAction() {
        val approvedPaths = checkboxes.filterValues { it.isSelected }.keys.toList()
        if (approvedPaths.isEmpty()) {
            Messages.showInfoMessage(project, "No candidates selected.", "Cleanup Review")
            return
        }

        val processManager = project.getService(CoreProcessManager::class.java)
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val pathsJson = approvedPaths.joinToString(",") { "\"${it.replace("\\", "\\\\")}\"" }
                val response =
                    processManager.sendCommand(
                        "executeCleanup",
                        Json.parseToJsonElement("""{"assetPaths":[$pathsJson]}""").jsonObject,
                    )
                val summary = Json.decodeFromJsonElement<com.sxnnyside.animoria.backend.CleanupSummaryData>(response)

                ApplicationManager.getApplication().invokeLater {
                    Messages.showInfoMessage(
                        project,
                        "Removed ${summary.removedAssetPaths.size} asset(s), reclaimed ${formatBytes(summary.bytesReclaimed)}.\n" +
                            "Moved to ${summary.trashLocation ?: "trash"}.",
                        "Cleanup Complete",
                    )
                }
            } catch (e: Exception) {
                com.sxnnyside.animoria.logging.AnimoriaLogger.error("Animoria: Failed to execute cleanup", e)
            }
        }

        super.doOKAction()
    }
}
