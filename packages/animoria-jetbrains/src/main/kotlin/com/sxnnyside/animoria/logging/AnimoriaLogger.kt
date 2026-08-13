package com.sxnnyside.animoria.logging

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger

/**
 * Routes `@animoria/core`'s diagnostic log entries from the CLI daemon to
 * IntelliJ's `Logger` channel, and — for errors and warnings — to the
 * "Animoria" notification group as well.
 *
 * ## Why both
 * `Logger` entries land in IntelliJ's global `idea.log`, mixed with every
 * other plugin and platform component — effectively undiscoverable without
 * already knowing to look there. The notification group surfaces in the
 * IDE's **Event Log** tool window (`View → Tool Windows → Notifications`,
 * or bottom status bar), filterable by plugin, and persists across the
 * session — the same practical discoverability VS Code's dedicated
 * "Animoria" Output channel provides. Only warnings and errors go there;
 * routine info/debug stays in `Logger` only, since a notification per
 * scan-progress tick would be noise, not a diagnostic surface.
 */
object AnimoriaLogger {
    private val log = Logger.getInstance("Animoria")
    private const val NOTIFICATION_GROUP_ID = "Animoria"

    /** Formats and routes a daemon log payload to the IntelliJ Logger (and Event Log for warn/error). */
    fun log(
        level: String,
        operation: String,
        component: String,
        message: String,
        details: Map<String, String> = emptyMap(),
    ) {
        val detailStr = if (details.isEmpty()) "" else " (${details.entries.joinToString(", ") { "${it.key}=${it.value}" }})"
        val formatted = "[$operation] $component: $message$detailStr"

        when (level.uppercase()) {
            "ERROR" -> error(formatted)
            "WARN" -> warn(formatted)
            "DEBUG" -> log.debug(formatted)
            else -> log.info(formatted)
        }
    }

    /** Convenience overload for simple info-level messages. Logger only — not the Event Log. */
    fun info(message: String) = log.info(message)

    /** Warning message — routed to both the Logger and the Event Log. */
    fun warn(message: String) {
        log.warn(message)
        notify(message, NotificationType.WARNING)
    }

    /** Error message — routed to both the Logger and the Event Log. */
    fun error(
        message: String,
        cause: Throwable? = null,
    ) {
        if (cause != null) log.error(message, cause) else log.error(message)
        notify(message, NotificationType.ERROR)
    }

    private fun notify(
        message: String,
        type: NotificationType,
    ) {
        try {
            NotificationGroupManager.getInstance()
                .getNotificationGroup(NOTIFICATION_GROUP_ID)
                .createNotification(message, type)
                .notify(null)
        } catch (error: Exception) {
            // Best-effort only — a missing or misconfigured notification group must
            // never prevent the Logger call above from succeeding, which has already
            // happened by the time this runs.
            //
            // Recorded through `log` rather than `warn`, both because `warn` would
            // re-enter this method and because an entirely empty catch is the shape
            // this codebase now refuses on principle: the audit found one hiding a
            // contract mismatch that had silenced the whole plugin.
            log.warn("Animoria: could not post a notification — ${error.message}")
        }
    }
}
