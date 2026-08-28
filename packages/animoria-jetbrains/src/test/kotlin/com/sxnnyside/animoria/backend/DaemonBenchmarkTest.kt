package com.sxnnyside.animoria.backend

import kotlinx.serialization.json.*
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.PrintWriter

@DisplayName("JetBrains Consumer Benchmark: Legacy vs Native Daemon")
class DaemonBenchmarkTest {
    @Test
    @DisplayName("Benchmark Native Rust Daemon when driven by JetBrains")
    fun benchmarkNativeDaemon() {
        val root = File("../..").canonicalFile
        val nativeBin = File(root, "packages/animoria-core-rust/target/release/animoria")
        val fixturesDir = File(root, "fixtures")
        val cleanWs = File(fixturesDir, "clean-workspace")
        val dupWs = File(fixturesDir, "duplicates")

        // 1. Measure Cold Start (process spawn + ready for handshake)
        val coldStartBegin = System.nanoTime()
        val pb = ProcessBuilder(listOf(nativeBin.absolutePath, "daemon"))
        val proc = pb.start()
        val writer = PrintWriter(proc.outputStream.bufferedWriter(), true)
        val reader = BufferedReader(InputStreamReader(proc.inputStream, Charsets.UTF_8))
        val spawnDurationMs = (System.nanoTime() - coldStartBegin) / 1_000_000.0

        try {
            // 2. Measure Handshake Latency
            val hsBegin = System.nanoTime()
            val helloReq =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", "bench-hello")
                    put("method", "hello")
                    put("params", buildJsonObject {})
                }
            writer.println(helloReq.toString())
            val hsLine = reader.readLine()
            val hsLatencyMs = (System.nanoTime() - hsBegin) / 1_000_000.0
            assertNotNull(hsLine)

            // 3. Measure First (Cold) Analysis Latency
            val firstScanBegin = System.nanoTime()
            val scan1Req =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", "bench-scan-1")
                    put("method", "scan")
                    put(
                        "params",
                        buildJsonObject {
                            put("workspace_path", cleanWs.absolutePath)
                        },
                    )
                }
            writer.println(scan1Req.toString())
            val scan1Line = reader.readLine()
            val firstScanMs = (System.nanoTime() - firstScanBegin) / 1_000_000.0
            assertNotNull(scan1Line)

            // 4. Measure Subsequent (Warm) Analysis on Alive Daemon
            val warmScanBegin = System.nanoTime()
            val scan2Req =
                buildJsonObject {
                    put("protocol", 1)
                    put("id", "bench-scan-2")
                    put("method", "scan")
                    put(
                        "params",
                        buildJsonObject {
                            put("workspace_path", dupWs.absolutePath)
                        },
                    )
                }
            writer.println(scan2Req.toString())
            val scan2Line = reader.readLine()
            val warmScanMs = (System.nanoTime() - warmScanBegin) / 1_000_000.0
            assertNotNull(scan2Line)

            println("\n=======================================================")
            println("📊 JETBRAINS BENCHMARK METRICS (NATIVE RUST DAEMON)")
            println("=======================================================")
            println("🚀 Daemon Process Spawn (Cold Start) : ${String.format("%.2f", spawnDurationMs)} ms")
            println("🤝 Protocol v1 Hello Handshake       : ${String.format("%.2f", hsLatencyMs)} ms")
            println("⚡ First Workspace Analysis          : ${String.format("%.2f", firstScanMs)} ms")
            println("🔥 Subsequent (Warm) Workspace Scan  : ${String.format("%.2f", warmScanMs)} ms")
            println("=======================================================\n")
        } finally {
            proc.destroyForcibly()
        }
    }
}
