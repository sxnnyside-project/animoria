package com.sxnnyside.animoria.backend

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

// Guards against re-leaking background work outside project lifetime: 22 call sites used to launch into
// GlobalScope (application-lifetime, uncancellable), so coroutines outlived a closed project. All now use
// AnimoriaCoroutineScope.of(project) instead; this checks every .kt file under src/main, not just those seven.
@DisplayName("no plugin-owned coroutine outlives its project")
class CoroutineLifecycleTest {
    private val mainSourceRoot = File("src/main/kotlin")

    private fun kotlinSources(): List<File> {
        assertTrue(mainSourceRoot.exists(), "expected to find ${mainSourceRoot.absolutePath}")
        return mainSourceRoot.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
    }

    private fun stripComments(source: String): String =
        source
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .lines()
            .joinToString("\n") { line -> line.substringBefore("//") }

    @Test
    @DisplayName("no source file references GlobalScope")
    fun noGlobalScopeAnywhere() {
        val offenders =
            kotlinSources()
                // This file's own doc comment names GlobalScope to explain what it replaced —
                // stripping comments before matching is what keeps that explanation from
                // flagging itself as the defect it describes.
                .filter { stripComments(it.readText()).contains("GlobalScope") }
                .map { it.relativeTo(mainSourceRoot).path }

        assertTrue(
            offenders.isEmpty(),
            "GlobalScope must not be used for plugin-owned work; found in: $offenders. " +
                "Launch into AnimoriaCoroutineScope.of(project) instead.",
        )
    }

    @Test
    @DisplayName("AnimoriaCoroutineScope is a project-level, constructor-injected service")
    fun coroutineScopeServiceIsProjectScoped() {
        val source = stripComments(File(mainSourceRoot, "com/sxnnyside/animoria/backend/AnimoriaCoroutineScope.kt").readText())

        assertTrue(
            source.contains("Service.Level.PROJECT"),
            "The coroutine scope must be project-scoped, not application-scoped — an " +
                "application-scoped service would reintroduce the same leak GlobalScope had.",
        )
        // Whitespace-insensitive: ktlint may wrap a multi-supertype class header
        // across lines, and this checks what it declares, not how it is laid out.
        val classHeader = Regex("""class\s+AnimoriaCoroutineScope\s*:\s*([\s\S]*?)\{""").find(source)?.groupValues?.get(1)
        assertTrue(
            classHeader != null && classHeader.contains("Disposable") && classHeader.contains("CoroutineScope"),
            "The service must implement Disposable and CoroutineScope so the platform disposes it on project close.",
        )
    }

    @Test
    @DisplayName("AnimoriaCoroutineScope is registered as a project service")
    fun coroutineScopeServiceIsRegistered() {
        val pluginXml = File("src/main/resources/META-INF/plugin.xml").readText()

        assertFalse(
            pluginXml.isEmpty(),
            "expected to find src/main/resources/META-INF/plugin.xml",
        )
        assertTrue(
            pluginXml.contains("com.sxnnyside.animoria.backend.AnimoriaCoroutineScope"),
            "AnimoriaCoroutineScope must be declared as a <projectService> so the platform " +
                "constructs and disposes it — an unregistered service is never actually owned.",
        )
    }
}
