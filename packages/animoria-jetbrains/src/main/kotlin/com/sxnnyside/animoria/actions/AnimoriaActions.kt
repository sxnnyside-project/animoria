package com.sxnnyside.animoria.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project

// Standalone (not inner classes of the panel) so the platform can construct and register them via a no-arg
// constructor — that's what makes them reachable from Find Action, Search Everywhere, and the Keymap.
// Each resolves its project from AnActionEvent; the real work lives in AnimoriaActionHost.
abstract class AnimoriaAction(
    text: String,
    description: String,
    icon: javax.swing.Icon? = null,
) : AnAction(text, description, icon) {
    /**
     * Enables the action only when the project is active and the daemon engine is initialized.
     */
    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null && AnimoriaActionHost.of(project).isReady()
    }

    /** Presentation state is computed from `e.project` alone, so it needs no read action. */
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    final override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        perform(AnimoriaActionHost.of(project), project)
    }

    protected abstract fun perform(
        host: AnimoriaActionHost,
        project: Project,
    )
}

/** Re-scans the workspace and refreshes the canonical analysis. */
class RefreshAnalysisAction :
    AnimoriaAction(
        "Refresh Animoria Analysis",
        "Rescan the workspace and refresh the asset index",
        AllIcons.Actions.Refresh,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.refreshAnalysis()
}

/** Runs the configured governance rules and opens the report. */
class AnalyzeWorkspaceAction :
    AnimoriaAction(
        "Analyze Workspace With Animoria",
        "Run the configured governance rules and open the report",
        AllIcons.Actions.Checked,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.runGovernance()
}

/** Opens the governance report for the analysis Core already holds. */
class OpenGovernanceReportAction :
    AnimoriaAction(
        "Open Animoria Governance Report",
        "Open the current governance report",
        AllIcons.Actions.ListFiles,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.openGovernanceReport()
}

/** Opens the cleanup review dialog. */
class ReviewCleanupAction :
    AnimoriaAction(
        "Review Animoria Cleanup",
        "Review assets Animoria proposes removing",
        AllIcons.Actions.GC,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.reviewCleanup()
}

/**
 * Restores a previous cleanup or duplicate-resolution run from Core trash.
 *
 * Restore existed in the CLI and in VS Code but had no JetBrains surface at all,
 * which meant the same product removed assets reversibly in two clients and
 * irreversibly-in-practice in the third.
 */
class RestoreCleanupAction :
    AnimoriaAction(
        "Restore Animoria Cleanup",
        "Put assets from a previous cleanup or duplicate resolution back",
        AllIcons.Actions.Rollback,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.restoreFromTrash()
}

/** Opens Animoria's settings page. */
class OpenSettingsAction :
    AnimoriaAction(
        "Open Animoria Settings",
        "Configure Animoria for this project",
        AllIcons.General.Settings,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.openSettings()
}

/** Brings the Animoria tool window forward. */
class ShowAnimoriaToolWindowAction :
    AnimoriaAction(
        "Show Animoria",
        "Open the Animoria tool window",
        AllIcons.Actions.Preview,
    ) {
    override fun perform(
        host: AnimoriaActionHost,
        project: Project,
    ) = host.focusToolWindow()
}
