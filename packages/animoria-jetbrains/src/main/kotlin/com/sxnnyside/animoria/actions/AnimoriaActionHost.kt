package com.sxnnyside.animoria.actions

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.wm.ToolWindowManager
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.backend.RestoreResultData
import com.sxnnyside.animoria.backend.TrashSessionData
import com.sxnnyside.animoria.backend.TrashSessionsData
import com.sxnnyside.animoria.governance.GovernanceReportEditor
import com.sxnnyside.animoria.logging.AnimoriaLogger
import com.sxnnyside.animoria.ui.AnimoriaSharedUiPanel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.put

/**
 * Project-level coordinator executing Animoria user operations triggered from actions, toolbars, and menus.
 *
 * Serves as the single authority translating user intent into daemon commands or UI navigation, preventing
 * diverging logic between menu actions and tool window controls. Does not perform governance calculations locally;
 * instead forwards requests to [CoreProcessManager] and routes results to editor documents or UI panels.
 */
@Service(Service.Level.PROJECT)
class AnimoriaActionHost(
    private val project: Project,
) {
    companion object {
        /**
         * Resolves the project-level [AnimoriaActionHost] coordinator service instance.
         *
         * @param project The active project.
         * @return The bound [AnimoriaActionHost] instance.
         */
        fun of(project: Project): AnimoriaActionHost = project.service()

        /** Tool window id, shared with the factory that registers it. */
        const val TOOL_WINDOW_ID = "Animoria"
    }

    private val json = Json { ignoreUnknownKeys = true }

    private val processManager: CoreProcessManager
        get() = project.getService(CoreProcessManager::class.java)

    /**
     * Determines whether Animoria has a workspace it can act upon.
     *
     * Evaluates daemon readiness or presence of a valid base directory to ensure action availability guards
     * operate safely without blocking the UI thread.
     *
     * @return `true` if the project or daemon is ready to accept commands; `false` otherwise.
     */
    fun isReady(): Boolean = processManager.isReady || project.basePath != null

    // ── Operations ────────────────────────────────────────────────────────────

    /**
     * Re-scans the workspace and refreshes the canonical analysis.
     *
     * Runs under `Task.Backgroundable` so the IDE shows its own progress UI and
     * the user can keep working — a rescan used to be a silent coroutine with no
     * indication it was happening.
     */
    fun refreshAnalysis() {
        runInBackground("Animoria: refreshing analysis") {
            val root = project.basePath.orEmpty()
            val params = if (root.isNotEmpty()) buildJsonObject { put("workspace_path", root) } else buildJsonObject {}
            processManager.sendCommand("getAnalysis", params)
        }
    }

    /** Runs the configured governance rules and opens the resulting report. */
    fun runGovernance() {
        runInBackground("Animoria: running governance") {
            val root = project.basePath.orEmpty()
            val params = if (root.isNotEmpty()) buildJsonObject { put("workspace_path", root) } else buildJsonObject {}
            processManager.sendCommand("analyze", params, timeoutMs = CoreProcessManager.ANALYZE_TIMEOUT_MS)
            ApplicationManager.getApplication().invokeLater { GovernanceReportEditor.open(project) }
        }
    }

    /** Opens the governance report for the analysis Core already holds. */
    fun openGovernanceReport() {
        GovernanceReportEditor.open(project)
    }

    /**
     * Activates the tool window and focuses the Cleanup review tab.
     */
    fun reviewCleanup() {
        focusToolWindow()
        // On the cleanup tab, not merely in the tool window. Bringing the window
        // forward and stopping there left the developer on whichever tab they had
        // last used — for a first click, the assets grid.
        AnimoriaSharedUiPanel.of(project, "cleanup")?.focus(AnimoriaSharedUiPanel.Focus(tab = "cleanup"))
    }

    /** Brings the Animoria tool window forward. */
    fun focusToolWindow() {
        ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID)?.activate(null)
    }

    /** Opens Animoria's settings page in the IDE's own Settings dialog. */
    fun openSettings() {
        com.intellij.openapi.options.ShowSettingsUtil
            .getInstance()
            .showSettingsDialog(project, "Animoria")
    }

    /**
     * Restores a previous cleanup or duplicate-resolution run from Core trash.
     *
     * Lists the sessions that genuinely exist and lets the developer pick one.
     * Sessions are never reconstructed from filenames: the daemon reads the trash
     * manifests Core wrote, so a session offered here is one that can actually be
     * restored.
     */
    fun restoreFromTrash() {
        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
            val sessions =
                try {
                    val response = processManager.sendCommand("listTrashSessions")
                    // Flattened, with each session tagged by the root it belongs to —
                    // `restoreTrashSession` refuses without a `rootId`.
                    json.decodeFromJsonElement<TrashSessionsData>(response).roots.flatMap { root ->
                        root.sessions.map { root.rootId to it }
                    }
                } catch (e: Exception) {
                    AnimoriaLogger.error("Animoria: Could not list trash sessions", e)
                    reportError("Could not read the trash: ${e.message}")
                    return@launch
                }

            if (sessions.isEmpty()) {
                ApplicationManager.getApplication().invokeLater {
                    Messages.showInfoMessage(project, "Nothing in trash to restore.", "Animoria")
                }
                return@launch
            }

            ApplicationManager.getApplication().invokeLater { chooseSession(sessions) }
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * Offers the trash sessions that actually exist, as a native popup list.
     *
     * A popup rather than a modal chooser because this is a pick-from-a-list
     * gesture, which is what JetBrains developers expect `JBPopupFactory` to
     * handle — and because the list is built from real manifests, so an entry
     * shown here is one that can genuinely be restored.
     */
    private fun chooseSession(sessions: List<Pair<String, TrashSessionData>>) {
        JBPopupFactory
            .getInstance()
            .createPopupChooserBuilder(sessions)
            .setTitle("Restore From Trash")
            .setRenderer(
                object : javax.swing.DefaultListCellRenderer() {
                    override fun getListCellRendererComponent(
                        list: javax.swing.JList<*>?,
                        value: Any?,
                        index: Int,
                        selected: Boolean,
                        focused: Boolean,
                    ): java.awt.Component {
                        @Suppress("UNCHECKED_CAST")
                        val session = (value as? Pair<String, TrashSessionData>)?.second
                        val label =
                            if (session == null) {
                                ""
                            } else {
                                "${session.entries.size} asset(s) · ${session.movedAt}"
                            }
                        return super.getListCellRendererComponent(list, label, index, selected, focused)
                    }
                },
            ).setItemChosenCallback { chosen -> performRestore(chosen.first, chosen.second) }
            .createPopup()
            .showCenteredInCurrentWindow(project)
    }

    private fun performRestore(
        rootId: String,
        session: TrashSessionData,
    ) {
        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
            try {
                val response =
                    processManager.sendCommand(
                        "restoreTrashSession",
                        buildJsonObject {
                            put("sessionId", session.sessionId)
                            put("rootId", rootId)
                        },
                    )
                val result = json.decodeFromJsonElement<RestoreResultData>(response)

                ApplicationManager.getApplication().invokeLater {
                    if (result.failures.isEmpty()) {
                        Messages.showInfoMessage(
                            project,
                            "Restored ${result.restoredPaths.size} asset(s).",
                            "Animoria",
                        )
                    } else {
                        // Naming what could *not* be restored, and why, rather than
                        // reporting a partial restore as a success.
                        val occupied = result.failures.filter { it.reason == "destination-occupied" }
                        val detail =
                            if (occupied.isEmpty()) {
                                result.failures.joinToString("\n") { "${it.originalPath} (${it.reason})" }
                            } else {
                                "Something new already exists at:\n" +
                                    occupied.joinToString("\n") { it.originalPath }
                            }
                        Messages.showWarningDialog(
                            project,
                            "Restored ${result.restoredPaths.size} asset(s).\n\n$detail",
                            "Animoria",
                        )
                    }
                }
            } catch (e: Exception) {
                AnimoriaLogger.error("Animoria: Restore failed", e)
                reportError("Restore failed: ${e.message}")
            }
        }
    }

    private fun reportError(message: String) {
        ApplicationManager.getApplication().invokeLater {
            Messages.showErrorDialog(project, message, "Animoria")
        }
    }

    /**
     * Executes an asynchronous daemon operation within IntelliJ's background task runner,
     * surfacing any unhandled failure via an error dialog.
     */
    private fun runInBackground(
        title: String,
        block: suspend () -> Unit,
    ) {
        ProgressManager
            .getInstance()
            .run(
                object : Task.Backgroundable(project, title, true) {
                    override fun run(indicator: ProgressIndicator) {
                        val latch = java.util.concurrent.CountDownLatch(1)
                        AnimoriaCoroutineScope.of(project).launch(Dispatchers.IO) {
                            try {
                                block()
                            } catch (e: Exception) {
                                AnimoriaLogger.error("Animoria: $title failed", e)
                                reportError("$title failed: ${e.message}")
                            } finally {
                                latch.countDown()
                            }
                        }
                        // The indicator's own thread waits for the coroutine so the
                        // progress bar reflects the real duration; cancellation is
                        // observed through the indicator rather than by abandoning
                        // the work untracked.
                        while (!latch.await(100, java.util.concurrent.TimeUnit.MILLISECONDS)) {
                            if (indicator.isCanceled) return
                        }
                    }
                },
            )
    }
}
