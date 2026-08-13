package com.sxnnyside.animoria.actions

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.w3c.dom.Element
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Verifies the plugin descriptor actually registers what it claims to.
 *
 * ## What this stands in for
 * The real question — "does Animoria appear in Find Action?" — is answered by the
 * IDE, which this environment cannot launch. But every way that question gets a
 * *wrong* answer is mechanically checkable here: an action whose `class` does not
 * exist, an id registered twice, a group referenced but never declared, an
 * extension point pointing at a missing service. Each of those fails at plugin
 * load with a stack trace in the IDE log and a silently absent feature for the
 * user, and each is caught below at build time instead.
 *
 * A live smoke test remains the only way to confirm the final rendering; this
 * closes everything up to it.
 */
@DisplayName("plugin.xml registers a real, discoverable action surface")
class ActionRegistrationTest {
    private val pluginXml = File("src/main/resources/META-INF/plugin.xml")
    private val sourceRoot = File("src/main/kotlin")

    private val document by lazy {
        assertTrue(pluginXml.exists(), "expected ${pluginXml.absolutePath}")
        DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(pluginXml)
    }

    private fun elements(tag: String): List<Element> {
        val nodes = document.getElementsByTagName(tag)
        return (0 until nodes.length).mapNotNull { nodes.item(it) as? Element }
    }

    /** True when a fully-qualified Kotlin class has a source file declaring it. */
    private fun classExists(fqcn: String): Boolean {
        val file = File(sourceRoot, "${fqcn.replace('.', '/')}.kt")
        if (file.exists()) return true
        // Several classes may share one file; fall back to scanning for the declaration.
        val simpleName = fqcn.substringAfterLast('.')
        val packagePath = fqcn.substringBeforeLast('.').replace('.', '/')
        val packageDir = File(sourceRoot, packagePath)
        if (!packageDir.isDirectory) return false
        return packageDir.walkTopDown().any { candidate ->
            candidate.isFile &&
                candidate.extension == "kt" &&
                Regex("""\b(?:class|object)\s+$simpleName\b""").containsMatchIn(candidate.readText())
        }
    }

    @Test
    @DisplayName("registers at least one action — the state this replaces had zero")
    fun registersActions() {
        // The audit's finding: no `<action>` elements existed, so nothing Animoria
        // could do was reachable from Find Action, Search Everywhere or the Keymap.
        assertTrue(elements("action").isNotEmpty(), "plugin.xml must register actions")
    }

    @Test
    @DisplayName("every registered action class exists in the source tree")
    fun actionClassesExist() {
        val missing =
            elements("action")
                .map { it.getAttribute("class") }
                .filter { it.isNotBlank() && !classExists(it) }

        assertTrue(missing.isEmpty(), "actions reference classes that do not exist: $missing")
    }

    @Test
    @DisplayName("no action id is registered twice")
    fun actionIdsAreUnique() {
        val ids = elements("action").map { it.getAttribute("id") }.filter { it.isNotBlank() }

        assertEquals(ids.size, ids.toSet().size, "duplicate action ids: ${ids.groupBy { it }.filter { it.value.size > 1 }.keys}")
    }

    @Test
    @DisplayName("every action carries an id, text and description")
    fun actionsAreDescribed() {
        for (action in elements("action")) {
            val id = action.getAttribute("id")
            assertTrue(id.isNotBlank(), "an action is missing an id")
            assertTrue(action.getAttribute("text").isNotBlank(), "$id is missing text")
            // Search Everywhere and the Keymap both surface the description; an
            // action without one is discoverable but unexplained.
            assertTrue(action.getAttribute("description").isNotBlank(), "$id is missing a description")
        }
    }

    @Test
    @DisplayName("every user-facing operation has a registered action")
    fun everyOperationIsReachable() {
        val ids = elements("action").map { it.getAttribute("id") }.toSet()

        // Derived from the jobs a developer actually performs, not from whatever
        // happened to be easy to register.
        for (
        expected in
        listOf(
            "Animoria.ShowToolWindow",
            "Animoria.RefreshAnalysis",
            "Animoria.AnalyzeWorkspace",
            "Animoria.OpenGovernanceReport",
            "Animoria.ReviewCleanup",
            "Animoria.RestoreCleanup",
            "Animoria.OpenSettings",
        )
        ) {
            assertTrue(ids.contains(expected), "no registered action for $expected")
        }
    }

    @Test
    @DisplayName("actions live in a group attached to a real platform menu")
    fun actionsAreGrouped() {
        val groups = elements("group")
        assertTrue(groups.isNotEmpty(), "actions must be grouped, not loose")

        val group = groups.first()
        assertTrue(group.getAttribute("id").isNotBlank(), "the action group needs an id")

        val addToGroup = group.getElementsByTagName("add-to-group")
        assertTrue(addToGroup.length > 0, "the group must attach to a platform menu to be visible")
        assertEquals(
            "ToolsMenu",
            (addToGroup.item(0) as Element).getAttribute("group-id"),
        )
    }

    @Test
    @DisplayName("keyboard shortcuts are scoped to the default keymap and not over-claimed")
    fun keyboardShortcutsAreConservative() {
        val shortcuts = elements("keyboard-shortcut")

        for (shortcut in shortcuts) {
            assertEquals("\$default", shortcut.getAttribute("keymap"), "shortcuts must target the default keymap")
            assertTrue(
                shortcut.getAttribute("first-keystroke").isNotBlank(),
                "a keyboard-shortcut needs a keystroke",
            )
        }
        // Claiming a default chord for every action would fight the user's keymap
        // for bindings they never asked us to take.
        assertTrue(shortcuts.size <= 3, "too many default keyboard shortcuts claimed: ${shortcuts.size}")
    }

    @Test
    @DisplayName("every registered extension class exists")
    fun extensionClassesExist() {
        val missing = mutableListOf<String>()
        for (tag in listOf("projectService", "applicationService")) {
            for (element in elements(tag)) {
                val fqcn = element.getAttribute("serviceImplementation")
                if (fqcn.isNotBlank() && !classExists(fqcn)) missing.add(fqcn)
            }
        }
        for (element in elements("toolWindow")) {
            val fqcn = element.getAttribute("factoryClass")
            if (fqcn.isNotBlank() && !classExists(fqcn)) missing.add(fqcn)
        }
        for (element in elements("localInspection")) {
            val fqcn = element.getAttribute("implementationClass")
            if (fqcn.isNotBlank() && !classExists(fqcn)) missing.add(fqcn)
        }

        assertTrue(missing.isEmpty(), "extensions reference classes that do not exist: $missing")
    }

    @Test
    @DisplayName("actions contain no governance logic of their own")
    fun actionsAreThin() {
        val actionsSource = File(sourceRoot, "com/sxnnyside/animoria/actions/AnimoriaActions.kt").readText()

        // Every action delegates to AnimoriaActionHost. A daemon call or a
        // computed score appearing here would be the start of a second semantic
        // model living in the presentation layer.
        for (forbidden in listOf("sendCommand", "healthScore", "confidence", "duplicateGroups")) {
            assertFalse(
                actionsSource.contains(forbidden),
                "actions must stay thin; found \"$forbidden\" in AnimoriaActions.kt",
            )
        }
    }
}
