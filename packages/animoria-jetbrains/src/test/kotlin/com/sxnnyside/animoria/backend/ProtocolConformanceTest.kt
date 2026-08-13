package com.sxnnyside.animoria.backend

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The JetBrains client speaks protocol v1, and nothing else.
 *
 * ## Why source-level
 * Driving a real daemon from a Gradle test would require the built Node artifact to
 * be present, which couples this module's tests to another package's build. The
 * daemon side of the protocol is exercised against a real spawned binary in
 * `@animoria/core`'s own suite; what can only be checked *here* is that the Kotlin
 * client's half of the contract matches — the envelope it writes, the version it
 * claims, and the fact that it no longer speaks the old dialect.
 */
@DisplayName("JetBrains client conforms to daemon protocol v1")
class ProtocolConformanceTest {
    private val manager =
        File("src/main/kotlin/com/sxnnyside/animoria/backend/CoreProcessManager.kt")

    private fun source(): String {
        assertTrue(manager.exists(), "expected ${manager.absolutePath}")
        return manager.readText()
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .lines()
            .joinToString("\n") { it.substringBefore("//") }
    }

    @Test
    @DisplayName("declares the same protocol version the daemon does")
    fun protocolVersionsAgree() {
        // A plugin and a daemon that disagree here produce a mismatch banner at every
        // startup — visible, but only after shipping. The TypeScript constant is the
        // source of truth; this asserts the Kotlin copy tracks it.
        val protocolTs =
            File("../animoria-core/src/daemon/protocol.ts").readText()
        val declared =
            Regex("""PROTOCOL_VERSION\s*=\s*(\d+)""").find(protocolTs)?.groupValues?.get(1)

        assertEquals(
            declared,
            CoreProcessManager.PROTOCOL_VERSION.toString(),
            "CoreProcessManager.PROTOCOL_VERSION must match @animoria/core's PROTOCOL_VERSION",
        )
    }

    @Test
    @DisplayName("writes a v1 request envelope")
    fun writesVersionedEnvelope() {
        val code = source()
        // `method`/`params`/`protocol`/`id` — not the old `command`/`data`/`requestId`.
        for (field in listOf("\"protocol\"", "\"id\"", "\"method\"", "\"params\"")) {
            assertTrue(code.contains("put($field"), "request envelope must carry $field")
        }
    }

    @Test
    @DisplayName("no longer writes the untagged legacy envelope")
    fun legacyDialectIsGone() {
        val code = source()
        // The old envelope had no version, so a host and a daemon of different
        // vintages exchanged payloads each interpreted under its own assumptions.
        assertFalse(
            code.contains("put(\"command\","),
            "the legacy `command` envelope must not survive alongside v1",
        )
        assertFalse(
            code.contains("json[\"data\"]"),
            "the legacy `data` field must not survive alongside v1",
        )
    }

    @Test
    @DisplayName("refuses a daemon whose protocol version differs")
    fun rejectsMismatchedDaemon() {
        val code = source()
        assertTrue(
            code.contains("reportProtocolMismatch"),
            "a version mismatch must be reported, never silently tolerated",
        )
        // The failure must be terminal-and-explained, not an indefinite wait: a
        // client that keeps showing "loading" for a broken install gives the
        // developer nothing to act on.
        assertTrue(
            code.contains("onDaemonUnavailable?.invoke"),
            "a mismatch must reach the host as an unavailable daemon",
        )
    }

    @Test
    @DisplayName("distinguishes responses from events")
    fun responsesAndEventsAreDisjoint() {
        val code = source()
        // A response carries `id`; an event carries `event` and `sequence`. The old
        // protocol let `commandError` be an event wearing a response's shape, so
        // nothing in the format said which messages a caller could wait for.
        assertTrue(code.contains("json[\"id\"]"), "responses are correlated by id")
        assertTrue(code.contains("json[\"event\"]"), "events are named by event")
        assertTrue(code.contains("json[\"sequence\"]"), "events carry a sequence")
    }

    @Test
    @DisplayName("asserts event ordering rather than assuming it")
    fun assertsEventOrdering() {
        val code = source()
        assertTrue(
            code.contains("recordSequence"),
            "out-of-order events must be detected, not rendered around",
        )
    }

    @Test
    @DisplayName("waits for readiness rather than racing startup")
    fun gatesOnReadiness() {
        val code = source()
        assertTrue(code.contains("isReady"), "the client must track daemon readiness")
        assertTrue(code.contains("\"ready\""), "the client must handle the ready event")
    }

    @Test
    @DisplayName("spawns the daemon over every content root, not project.basePath alone")
    fun spawnsWithEveryContentRoot() {
        val code = source()
        // `basePath` is where `.idea` lives, not the project's asset universe. A
        // multi-module project has roots it does not contain, and the plugin reported
        // their assets as absent rather than as unscanned.
        assertTrue(
            code.contains("resolveContentRoots"),
            "roots must come from the platform's module model",
        )
        assertTrue(code.contains("ModuleRootManager"), "content roots come from ModuleRootManager")
        assertTrue(
            code.contains("\"daemon\""),
            "the daemon subcommand must be explicit, so a root is never parsed as a flag",
        )
    }

    @Test
    @DisplayName("surfaces a structured error code rather than prose")
    fun structuredErrors() {
        val code = source()
        assertTrue(
            code.contains("DaemonRequestException"),
            "a failed request must carry the protocol's error code so callers can branch",
        )
    }
}
