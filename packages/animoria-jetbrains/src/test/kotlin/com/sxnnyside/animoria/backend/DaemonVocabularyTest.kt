package com.sxnnyside.animoria.backend

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

/**
 * Verifies that every daemon method invoked by the JetBrains plugin is declared in the canonical
 * Protocol v1 daemon method vocabulary.
 */
@DisplayName("JetBrains speaks only the declared daemon vocabulary")
class DaemonVocabularyTest {
    private val kotlinRoot = File("src/main/kotlin")
    private val protocol = File("../animoria-core-rust/src/daemon/server.rs")

    /** The declared methods, read from the daemon itself. */
    private fun declaredMethods(): Set<String> {
        assertTrue(protocol.exists(), "expected ${protocol.absolutePath}")
        val block =
            Regex("""fn supported_methods\(\) -> Vec<String> \{\s*\[([\s\S]*?)\]""")
                .find(protocol.readText())
                ?.groupValues
                ?.get(1)
        assertTrue(block != null, "supported_methods() must be a literal array in server.rs")
        return Regex(""""([A-Za-z_]+)"""").findAll(block!!).map { it.groupValues[1] }.toSet()
    }

    /** Every Kotlin source, with comments blanked so prose cannot satisfy a gate. */
    private fun sources(): String =
        kotlinRoot
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { file ->
                file
                    .readText()
                    .replace(Regex("""/\*[\s\S]*?\*/""")) { it.value.replace(Regex("[^\n]"), " ") }
                    .lines()
                    .joinToString("\n") { line -> line.substringBefore("//") }
            }

    @Test
    @DisplayName("every method name it sends is declared by the protocol")
    fun everyCalledMethodIsDeclared() {
        val declared = declaredMethods()
        val source = sources()

        val called = mutableSetOf<String>()
        Regex("""sendCommand\(\s*"([A-Za-z]+)"""").findAll(source).forEach { called.add(it.groupValues[1]) }
        Regex("""private object Method \{([\s\S]*?)\n {4}\}""").find(source)?.groupValues?.get(1)?.let { block ->
            Regex("""= "([A-Za-z]+)"""").findAll(block).forEach { called.add(it.groupValues[1]) }
        }

        assertTrue(called.isNotEmpty(), "no daemon calls were found — this gate would pass vacuously")

        val undeclared = called - declared
        assertTrue(
            undeclared.isEmpty(),
            "these are not protocol methods and the daemon refuses them: $undeclared",
        )
    }

    @Test
    @DisplayName("the old invented names do not come back")
    fun inventedNamesAreGone() {
        val source = sources()
        for (name in listOf(
            "cleanupProposal",
            "resolveDuplicates",
            "restoreTrash",
            "getSnapshot",
            "runGovernance",
            "exportGovernanceReport",
        )) {
            assertFalse(
                source.contains("\"$name\""),
                "\"$name\" is not a daemon method — it shipped once and silently disabled a whole workflow",
            )
        }
    }

    @Test
    @DisplayName("restoring a trash session sends the root it belongs to")
    fun restoreCarriesItsRoot() {
        // A trash session lives under `.animoria/trash/` *inside a root*. The daemon
        // requires `rootId` and answers `invalid-params` without it — which is what
        // both restore paths in this plugin used to receive.
        val source = sources()
        // Call sites, not the constant's declaration — the `Method` object lists every
        // name together, so a window after the declaration would happily find another
        // method's parameters.
        val restoreSites =
            (
                Regex("""Method\.RESTORE_TRASH_SESSION[\s\S]{0,400}""").findAll(source) +
                    Regex("""sendCommand\(\s*(?://[^\n]*\n\s*)?"restoreTrashSession"[\s\S]{0,400}""")
                        .findAll(source)
            ).toList()
        assertTrue(restoreSites.isNotEmpty(), "expected at least one restore call")
        for (site in restoreSites) {
            assertTrue(
                site.value.contains("rootId"),
                "a restore must name the root its session belongs to",
            )
        }
    }

    @Test
    @DisplayName("editor hover reads Core's reference index rather than matching text")
    fun hoverIsNotAReimplementation() {
        // The deleted `AnimoriaEditorHoverListener` matched asset *stems* against raw
        // document text, with a four-character minimum to suppress the false positives
        // that approach produces, and conceded in its own doc comment that it was "an
        // approximation, not authoritative matching". Restoring the capability must
        // not restore that: `SemanticBoundaryTest` forbids Kotlin deciding what counts
        // as a reference, and this makes the hover specifically accountable to it.
        val hover = File("src/main/kotlin/com/sxnnyside/animoria/hover")
        assertTrue(hover.isDirectory, "the editor hover must exist — VS Code has one and JetBrains lost its")

        val source =
            hover.walkTopDown().filter { it.extension == "kt" }.joinToString("\n") { file ->
                file
                    .readText()
                    .replace(Regex("""/\*[\s\S]*?\*/""")) { it.value.replace(Regex("[^\n]"), " ") }
                    .lines()
                    .joinToString("\n") { line -> line.substringBefore("//") }
            }

        assertTrue(
            source.contains("referencesInFile"),
            "the hover must ask Core which assets a file references",
        )
        for (banned in listOf("contains(", "MIN_STEM_LENGTH", "indexOf(", "Regex(\"\\\\b")) {
            assertFalse(
                source.contains(banned),
                "the hover must not match asset names against document text itself: found \"$banned\"",
            )
        }
    }

    @Test
    @DisplayName("the shared UI bundle is packaged into the plugin")
    fun sharedUiIsPackaged() {
        // `AnimoriaSharedUiPanel` loads `/web/animoria-ui.global.js` from the jar and
        // nothing created that directory: the packaging step copied the *sandbox*
        // build into `resources/assets/` instead, where no Kotlin code reads it. A
        // built plugin's tool window therefore had no shared UI at all.
        val panel = File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaSharedUiPanel.kt")
        assertTrue(panel.exists(), "expected ${panel.absolutePath}")

        val loaded = Regex("""loadResource\("([^"]+)"\)""").findAll(panel.readText()).map { it.groupValues[1] }.toList()
        assertTrue(loaded.isNotEmpty(), "the panel must load its bundle from the jar")

        // Gradle's `copySharedUi` is what produces these, into
        // `build/generated-resources/web`, and `processResources` depends on it.
        val gradle = File("build.gradle.kts").readText()
        assertTrue(gradle.contains("copySharedUi"), "a packaging step must produce the panel's resources")
        assertTrue(gradle.contains("dependsOn(copySharedUi)"), "processResources must depend on it")
        for (resource in loaded) {
            assertTrue(
                gradle.contains(resource.substringAfterLast('/')),
                "nothing packages \"$resource\" — the plugin jar would ship without it",
            )
        }
    }
}
