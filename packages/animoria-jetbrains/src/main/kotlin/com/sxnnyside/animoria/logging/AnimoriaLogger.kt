package com.sxnnyside.animoria.logging

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger

/**
 * Routes diagnostic log entries from the native CLI daemon to IntelliJ's `Logger` channel
 * and surfaces critical errors/warnings in the IDE notification center.
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
            NotificationGroupManager
                .getInstance()
                .getNotificationGroup(NOTIFICATION_GROUP_ID)
                .createNotification(message, type)
                .notify(null)
        } catch (error: Exception) {
            // Best-effort notification delivery — failures are logged without re-throwing
            log.warn("Animoria: could not post a notification — ${error.message}")
        }
    }
}
