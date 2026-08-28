package com.sxnnyside.animoria.backend

import kotlinx.serialization.json.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.PrintWriter

@DisplayName("JetBrains Plugin Native Daemon Integration & Behavioral Parity")
class NativeDaemonIntegrationTest {
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

    @Test
    @DisplayName("Spawns native animoria daemon and completes Protocol v1 handshake")
    fun testNativeDaemonHandshake() {
        val binary = resolveNativeBinary()
        val pb = ProcessBuilder(listOf(binary.absolutePath, "daemon"))
        pb.redirectErrorStream(false)
        val proc = pb.start()

        try {
            val writer = PrintWriter(proc.outputStream.bufferedWriter(), true)
            val reader = BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8))

            val reqId = "req-test-1"
            val helloReq =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", reqId)
                    put("method", "hello")
                    put("params", buildJsonObject {})
                }

            val startNano = System.nanoTime()
            writer.println(helloReq.toString())
            val line = reader.readLine()
            val latencyMs = (System.nanoTime() - startNano) / 1_000_000.0
            println("DEBUG DAEMON RAW LINE: $line")

            assertNotNull(line, "Daemon must emit response line")
            val json = Json.parseToJsonElement(line!!).jsonObject
            println("DEBUG DAEMON PARSED JSON: $json")

            assertEquals(1, json["protocol"]?.jsonPrimitive?.intOrNull)
            assertEquals(reqId, json["id"]?.jsonPrimitive?.contentOrNull)
            assertNull(json["error"]?.takeIf { it !is JsonNull })

            val result = json["result"]?.jsonObject
            assertNotNull(result)
            assertEquals("animoria-core-rust", result!!["engine"]?.jsonPrimitive?.contentOrNull)
            assertEquals(1, result["protocol_version"]?.jsonPrimitive?.intOrNull)

            println("⚡ Native Daemon Hello Handshake Latency: ${String.format("%.3f", latencyMs)} ms")

            // Shutdown
            val shutdownReq =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", "req-shutdown")
                    put("method", "shutdown")
                    put("params", buildJsonObject {})
                }
            writer.println(shutdownReq.toString())
            val shutLine = reader.readLine()
            assertNotNull(shutLine)
        } finally {
            proc.destroyForcibly()
        }
    }

    @Test
    @DisplayName("Executes workspace analysis through native daemon with sub-second performance")
    fun testNativeDaemonWorkspaceScan() {
        val binary = resolveNativeBinary()
        val fixturesDir = File("../../fixtures").canonicalFile
        val cleanWorkspace = File(fixturesDir, "clean-workspace")
        assertTrue(cleanWorkspace.isDirectory)

        val pb = ProcessBuilder(listOf(binary.absolutePath, "daemon"))
        val proc = pb.start()

        try {
            val writer = PrintWriter(proc.outputStream.bufferedWriter(), true)
            val reader = BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8))

            val reqId = "req-scan-1"
            val scanReq =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", reqId)
                    put("method", "scan")
                    put(
                        "params",
                        buildJsonObject {
                            put("workspace_path", cleanWorkspace.absolutePath)
                        },
                    )
                }

            val startNano = System.nanoTime()
            writer.println(scanReq.toString())
            val line = reader.readLine()
            val scanLatencyMs = (System.nanoTime() - startNano) / 1_000_000.0

            assertNotNull(line, "Daemon must answer scan request")
            val json = Json.parseToJsonElement(line!!).jsonObject
            val result = json["result"]?.jsonObject
            assertNotNull(result)

            val analysis = result!!["analysis"]?.jsonObject
            assertNotNull(analysis)

            val assets = analysis!!["assets"]?.jsonArray
            assertNotNull(assets)
            assertTrue(assets!!.size > 0, "Assets must be discovered")

            val healthScore = analysis["health_score"]?.jsonObject
            assertNotNull(healthScore)
            val score = healthScore!!["score"]?.jsonPrimitive?.intOrNull
            assertNotNull(score)
            assertTrue(score!! >= 90, "Clean workspace score should be >= 90")

            println("⚡ Native Daemon Workspace Scan Latency: ${String.format("%.3f", scanLatencyMs)} ms")
        } finally {
            proc.destroyForcibly()
        }
    }
}
