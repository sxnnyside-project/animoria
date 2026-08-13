package com.sxnnyside.animoria.backend

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

/**
 * Guards against re-leaking background work outside project lifetime.
 *
 * ## What went wrong before
 * Twenty-two call sites across seven files launched their background work with
 * `GlobalScope.launch(Dispatchers.IO)`. `GlobalScope` is application-lifetime and
 * uncancellable, so a coroutine started while a project was open kept running after
 * that project closed — there was nowhere for a cancellation signal to reach it,
 * because no caller ever held a reference to anything that could cancel it.
 *
 * `AnimoriaCoroutineScope` (this package) is a `@Service(Service.Level.PROJECT)`
 * whose `CoroutineScope` the platform constructor-injects and cancels itself when
 * the project closes. Every call site now launches into `AnimoriaCoroutineScope.of(project)`
 * instead.
 *
 * These assertions are source-level, source-wide (every `.kt` file under `src/main`,
 * not one named file) — a leak can be reintroduced anywhere a background operation is
 * added, not only in the seven files fixed here.
 */
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
        assertTrue(
            source.contains("CoroutineScope") && source.contains("class AnimoriaCoroutineScope : Disposable, CoroutineScope"),
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
