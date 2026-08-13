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
 * The one place a JetBrains action's *intent* becomes an Animoria operation.
 *
 * ## Why actions do not talk to the daemon directly
 * Every user-facing operation has at least two entry points — a registered
 * `<action>` reachable from Find Action, Search Everywhere and the keymap, and a
 * button or context-menu item inside the tool window. Without a shared owner,
 * each entry point grows its own copy of "send this command, decode that
 * response, report the outcome," and the copies drift: that is precisely how the
 * cleanup dialog ended up with a native path and a JCEF path that disagreed
 * about whether a button existed.
 *
 * Actions here are deliberately thin. They resolve a project, call one method on
 * this host, and return. Nothing about governance — health, confidence, coverage,
 * orphan status, duplicate classification, cleanup categories — is decided in
 * Kotlin at all; the host forwards to the daemon and presents what comes back.
 */
@Service(Service.Level.PROJECT)
class AnimoriaActionHost(private val project: Project) {
    companion object {
        fun of(project: Project): AnimoriaActionHost = project.service()

        /** Tool window id, shared with the factory that registers it. */
        const val TOOL_WINDOW_ID = "Animoria"
    }

    private val json = Json { ignoreUnknownKeys = true }

    private val processManager: CoreProcessManager
        get() = project.getService(CoreProcessManager::class.java)

    /**
     * Whether Animoria has a workspace it can act on — the guard every action's
     * `update` uses.
     *
     * `project.basePath != null` was close enough for a single-root project and wrong
     * for a project opened as a set of modules with no base directory. The question
     * an action needs answered is "is there anything indexed?", which is what the
     * daemon's readiness reports.
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
            // `getSnapshot` is not a protocol method — the daemon answered every
            // refresh with `unsupported-method`, so this action never refreshed
            // anything. `getAnalysis` is the declared name.
            processManager.sendCommand("getAnalysis")
        }
    }

    /** Runs the configured governance rules and opens the resulting report. */
    fun runGovernance() {
        runInBackground("Animoria: running governance") {
            // `runGovernance` is not a protocol method either. `analyze` is the one
            // that completes the analysis and emits `analysis-completed`.
            processManager.sendCommand("analyze")
            ApplicationManager.getApplication().invokeLater { GovernanceReportEditor.open(project) }
        }
    }

    /** Opens the governance report for the analysis Core already holds. */
    fun openGovernanceReport() {
        GovernanceReportEditor.open(project)
    }

    /**
     * Opens cleanup review.
     *
     * This used to open a Swing dialog that reimplemented the review screen a fourth
     * time. Cleanup review is one of the shared UI's tabs now, so the action brings
     * the tool window forward rather than owning a surface of its own — which is also
     * why a JCEF-disabled IDE reaches the D-09 panel here instead of a dialog whose
     * whole purpose was to work around a browser it did not need.
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
        com.intellij.openapi.options.ShowSettingsUtil.getInstance()
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
        JBPopupFactory.getInstance()
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
            )
            .setItemChosenCallback { chosen -> performRestore(chosen.first, chosen.second) }
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
                        // `restoreTrash` is not a protocol method. The daemon answered
                        // every one of these with `unsupported-method`, so restoring
                        // from this action could never have worked.
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
     * Runs a daemon round-trip under the IDE's own background-task UI.
     *
     * A failure surfaces as a dialog rather than only a log line: a command that
     * silently does nothing is the state the migration exists to remove.
     */
    private fun runInBackground(
        title: String,
        block: suspend () -> Unit,
    ) {
        ProgressManager.getInstance()
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
