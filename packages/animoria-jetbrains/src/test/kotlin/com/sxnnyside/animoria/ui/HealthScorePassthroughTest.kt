package com.sxnnyside.animoria.ui

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The JetBrains client presents Core's decisions and computes none of its own.
 *
 * ## What went wrong before
 * `AnimoriaGalleryPanel` derived its own Health Score —
 * `100 - unused*5 - duplicates*10 - overused*5` — while `@animoria/core` computes a
 * weighted, severity-scaled score from rule diagnostics. The same workspace reported
 * one number in this IDE and a different one in VS Code and the CLI, and the panel
 * invented its own state vocabulary alongside Core's.
 *
 * ## Why this test survived the panel it was written for
 * That panel is deleted; the shared UI renders the score now. The *rule* is what
 * matters, so the scan moved from one file to the whole plugin. A local Health Score
 * would not come back in a file named `AnimoriaGalleryPanel.kt` — it would come back
 * in whatever file seemed like the convenient place, which is exactly why a
 * file-scoped assertion was the weaker version of this test.
 */
@DisplayName("JetBrains client does not compute governance values locally")
class HealthScorePassthroughTest {
    private val mainSourceRoot = File("src/main/kotlin")

    /**
     * Every Kotlin source, comments removed.
     *
     * Comments are stripped because the deleted code is *described* in the comments
     * that replaced it — matching raw text would flag the explanation of the fix as
     * though it were the defect.
     */
    private fun strippedSources(): List<Pair<String, String>> {
        assertTrue(mainSourceRoot.exists(), "expected ${mainSourceRoot.absolutePath}")
        return mainSourceRoot
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .map { it.relativeTo(mainSourceRoot).path to stripComments(it.readText()) }
            .toList()
    }

    private fun stripComments(source: String): String =
        source
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .lines()
            .joinToString("\n") { line -> line.substringBefore("//") }

    private fun offenders(pattern: Regex): List<String> =
        strippedSources().filter { (_, source) -> pattern.containsMatchIn(source) }.map { it.first }

    @Test
    @DisplayName("no file derives a Health Score from category counts")
    fun doesNotDeriveHealthScore() {
        val found = offenders(Regex("""100\s*-\s*\w*[Uu]nused"""))
        assertTrue(
            found.isEmpty(),
            "Health must come from Core, not be computed in Kotlin: $found",
        )
    }

    @Test
    @DisplayName("no file defines its own health state vocabulary")
    fun doesNotDefineHealthStateLabels() {
        for (label in listOf("\"EXCELLENT\"", "\"NEEDS ATTENTION\"", "\"Excellent\"")) {
            val found = offenders(Regex(Regex.escape(label)))
            assertTrue(
                found.isEmpty(),
                "Core owns the health vocabulary; $label appears in $found",
            )
        }
    }

    @Test
    @DisplayName("no file defaults an absent score to a passing number")
    fun rendersAbsentScoreAsUnavailable() {
        // `data.healthScore || 100` was the original: a workspace Core could not score
        // rendered as a perfect one.
        val found = offenders(Regex("""healthScore\s*\|\|\s*\d"""))
        assertTrue(found.isEmpty(), "An absent Health Score must not default to a number: $found")
    }

    @Test
    @DisplayName("the analysis reaches the UI verbatim through the bridge")
    fun analysisIsForwardedVerbatim() {
        val bridge =
            File("src/main/kotlin/com/sxnnyside/animoria/bridge/JetBrainsHostBridge.kt")
        assertTrue(bridge.exists(), "expected the host bridge at ${bridge.absolutePath}")
        val source = stripComments(bridge.readText())

        // Asserted as a property, not as a call.
        //
        // This used to require `encodeToJsonElement(analysis)` — the *mechanism* by
        // which the bridge re-encoded its own flattened Kotlin model. That model has
        // no `roots`, no `lifecycle`, no `freshness` and no per-root
        // `referenceCounts`, so what it forwarded was never the canonical analysis;
        // it was a lossy reconstruction wearing the name. Pinning the implementation
        // made the defect a requirement, and the test passed for as long as it
        // existed. What matters is that the bytes the daemon sent are the bytes the
        // UI receives.
        assertTrue(
            source.contains("currentCanonical()"),
            "The bridge must forward the daemon's own analysis payload, not a model " +
                "it re-encodes — a client-side reconstruction is where its own " +
                "vocabulary creeps back in.",
        )
        assertFalse(
            source.contains("encodeToJsonElement(analysis)"),
            "Re-encoding the plugin's flattened analysis drops roots, lifecycle and " +
                "freshness — every field the shared UI's view model is built from.",
        )
        assertFalse(
            Regex("""put\("healthScore"""").containsMatchIn(source),
            "The bridge must not lift individual health fields out of the analysis.",
        )
    }
}
