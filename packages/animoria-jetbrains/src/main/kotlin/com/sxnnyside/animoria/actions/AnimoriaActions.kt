package com.sxnnyside.animoria.actions

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project

/**
 * Animoria's registered JetBrains actions.
 *
 * ## Why these are standalone classes rather than panel members
 * Every action here used to be an `inner class` of `AnimoriaGalleryPanel`, which
 * made each one reachable exactly one way: by finding the panel's toolbar. The
 * plugin registered **zero** `<action>` elements, so nothing Animoria could do
 * appeared in Find Action, Search Everywhere, or the Keymap — the three places a
 * JetBrains developer actually looks for a command. An action bound to a panel
 * instance cannot be registered, because the platform instantiates registered
 * actions itself through a no-argument constructor.
 *
 * These resolve their project from the [AnActionEvent] instead, so the platform
 * can construct them, the keymap can bind them, and the tool window can still
 * reuse the exact same instances for its toolbar. One implementation, several
 * discovery paths — rather than one implementation per discovery path.
 *
 * ## Why every one of them is three lines
 * The work lives in [AnimoriaActionHost]. An action's whole job is to answer
 * "should this be enabled right now" and "which operation did the user ask
 * for" — no daemon calls, no decoding, and emphatically no governance
 * arithmetic. See the host's own documentation for why that boundary is drawn
 * where it is.
 */
abstract class AnimoriaAction(
    text: String,
    description: String,
    icon: javax.swing.Icon? = null,
) : AnAction(text, description, icon) {
    /**
     * Enabled only when there is a workspace to act on.
     *
     * Without this, every action stays clickable in a project Animoria cannot
     * index and fails silently when invoked — the class of "nothing happened and
     * nothing said why" this wave exists to remove.
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
