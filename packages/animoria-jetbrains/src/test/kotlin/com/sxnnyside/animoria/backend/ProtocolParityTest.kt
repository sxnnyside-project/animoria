package com.sxnnyside.animoria.backend

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.PrintWriter

// Unlike NativeDaemonIntegrationTest (proves the daemon responds), this proves CoreProcessManager can decode
// what comes back: sends `analyze`, waits for the pushed `analysis-completed` event (not the request's own
// response, matching the real client), and decodes it with the actual MultiRootAnalysisData class.
@OptIn(ExperimentalSerializationApi::class)
@DisplayName("JetBrains decode contract: MultiRootAnalysisData against a live daemon")
class ProtocolParityTest {
    private val payloadJson = Json { ignoreUnknownKeys = true }

    private fun resolveNativeBinary(): File {
        val root = File("../..").canonicalFile
        val candidates =
            listOf(
                File(root, "packages/animoria-core-rust/target/release/animoria"),
                File(root, "packages/animoria-core-rust/target/debug/animoria"),
            )
        val found = candidates.firstOrNull { it.exists() && it.canExecute() }
        assertNotNull(found, "Native animoria binary must exist for integration tests. Run 'cargo build' first.")
        return found!!
    }

    /** The first line matching `predicate`, skipping every other NDJSON line. */
    private fun readUntil(
        reader: BufferedReader,
        predicate: (JsonObject) -> Boolean,
    ): JsonObject {
        while (true) {
            val line = reader.readLine() ?: error("Daemon stream ended before a matching line arrived")
            val parsed = runCatching { Json.parseToJsonElement(line).jsonObject }.getOrNull() ?: continue
            if (predicate(parsed)) return parsed
        }
    }

    @Test
    @DisplayName("analysis-completed event decodes as MultiRootAnalysisData and flattens to real assets")
    fun testAnalysisCompletedEventDecodesForRealFixture() {
        val binary = resolveNativeBinary()
        val fixturesDir = File("../../fixtures").canonicalFile
        val cleanWorkspace = File(fixturesDir, "clean-workspace")
        assertTrue(cleanWorkspace.isDirectory)

        val proc = ProcessBuilder(listOf(binary.absolutePath, "daemon")).apply { redirectErrorStream(false) }.start()

        try {
            val writer = PrintWriter(proc.outputStream.bufferedWriter(), true)
            val reader = BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8))

            val analyzeReq =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", "req-analyze-1")
                    put("method", "analyze")
                    put(
                        "params",
                        buildJsonObject { put("workspace_path", cleanWorkspace.absolutePath) },
                    )
                }
            writer.println(analyzeReq.toString())

            // The plugin discards the request/response pair for exactly this
            // reason (see `daemon/server.rs`'s comment on the synthesized
            // event) and waits for the pushed event instead — so this test
            // waits for the same thing, not for the response line.
            val event = readUntil(reader) { it["event"]?.jsonPrimitive?.contentOrNull == "analysis-completed" }
            val payload = event["payload"]?.jsonObject
            assertNotNull(payload, "analysis-completed event must carry a payload")
            assertTrue(payload!!.containsKey("roots"), "payload must be the MultiRootAnalysis shape (has 'roots')")

            val decoded =
                payloadJson.decodeFromJsonElement<MultiRootAnalysisData>(payload)
            val flattened = decoded.flatten()

            assertTrue(flattened.assets.isNotEmpty(), "a clean-workspace scan must decode to at least one asset")
            assertEquals(
                decoded.roots.sumOf { it.assets.size },
                flattened.assets.size,
                "flatten() must not drop or duplicate assets across roots",
            )
            // Guards the exact regression `daemon/server.rs`'s comment describes:
            // duplicateGroups arriving at the top level of the payload, not nested
            // in `analysis`, so a payload shape change that dropped it would leave
            // the Duplicates tab silently at zero while this assertion catches it.
            assertNotNull(decoded.duplicateGroups)
        } finally {
            proc.destroyForcibly()
        }
    }
}
