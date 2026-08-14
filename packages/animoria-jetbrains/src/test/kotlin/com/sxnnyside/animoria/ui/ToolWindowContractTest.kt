package com.sxnnyside.animoria.ui

import com.intellij.openapi.wm.ToolWindowFactory
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.w3c.dom.Element
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Pins the tool window's registration, and the compiler setting that keeps it clean.
 *
 * ## The regression this exists for
 * The Plugin Verifier reported ten findings against Animoria 1.0.1 — deprecated
 * `isApplicable` and `isDoNotActivateOnStart`, experimental `manage`, internal
 * `getAnchor`, `getIcon` and `manage` — all in `AnimoriaToolWindowFactory`, a class
 * whose source mentions none of them. `ToolWindowFactory` is a Kotlin interface, and in
 * the Kotlin compiler's default `enable` jvm-default mode every class implementing it
 * gets a *compatibility stub* per inherited default member. The findings were real
 * bytecode; the source was innocent.
 *
 * That makes the defect invisible to code review and invisible to any test that reads
 * source text. [noForbiddenPlatformMembersAreDeclared] therefore asks the compiled class
 * what it declares, which is the same question the verifier asks — deleting
 * `-jvm-default=no-compatibility` from `build.gradle.kts` fails it immediately, rather
 * than a release later.
 *
 * ## What this cannot do
 * Nothing here launches an IDE. Whether the tool window *renders*, whether the icon
 * looks right on a dark theme, and whether the daemon starts when the window opens are
 * all live-IDE questions. What is checked is every mechanical precondition to them:
 * that the descriptor registers the factory it claims, under the id the platform and
 * `AnimoriaToolWindows` both key on, with the anchor and icon configured declaratively,
 * and with no leftover startup or applicability override changing the platform's
 * defaults behind the extension point's back.
 */
@DisplayName("the Animoria tool window is registered as a modern platform citizen")
class ToolWindowContractTest {
    private val pluginXml = File("src/main/resources/META-INF/plugin.xml")
    private val buildScript = File("build.gradle.kts")
    private val factorySource =
        File("src/main/kotlin/com/sxnnyside/animoria/ui/AnimoriaToolWindowFactory.kt")

    private val document by lazy {
        assertTrue(pluginXml.exists(), "expected ${pluginXml.absolutePath}")
        DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(pluginXml)
    }

    private fun elements(tag: String): List<Element> {
        val nodes = document.getElementsByTagName(tag)
        return (0 until nodes.length).mapNotNull { nodes.item(it) as? Element }
    }

    private val toolWindow: Element by lazy {
        val declared = elements("toolWindow")
        assertEquals(
            1,
            declared.size,
            "expected exactly one <toolWindow> registration; found ${declared.size}",
        )
        declared.single()
    }

    /**
     * The five members the platform does not want a plugin declaring: two deprecated,
     * one experimental, and three internal (`manage` is both experimental and internal).
     */
    private val forbiddenMembers =
        setOf(
            "isApplicable",
            "isDoNotActivateOnStart",
            "manage",
            "getAnchor",
            "getIcon",
        )

    @Test
    @DisplayName("the compiled factory declares none of the forbidden ToolWindowFactory members")
    fun noForbiddenPlatformMembersAreDeclared() {
        val declared = AnimoriaToolWindowFactory::class.java.declaredMethods.map { it.name }.toSet()

        val offenders = declared intersect forbiddenMembers
        assertTrue(
            offenders.isEmpty(),
            "AnimoriaToolWindowFactory declares ${offenders.sorted()} in its bytecode. If the " +
                "source does not override them, `-jvm-default=no-compatibility` has been lost " +
                "from build.gradle.kts and the compiler is emitting compatibility stubs again — " +
                "which is exactly what the Plugin Verifier flagged in 1.0.1.",
        )

        // Guards the guard: if the class ever stopped implementing the interface, or the
        // reflection above silently returned nothing, the assertion above would pass for
        // the wrong reason.
        assertTrue(
            ToolWindowFactory::class.java.isAssignableFrom(AnimoriaToolWindowFactory::class.java),
            "AnimoriaToolWindowFactory must still be a ToolWindowFactory",
        )
        assertTrue(
            declared.contains("createToolWindowContent"),
            "the factory must still implement createToolWindowContent; declared members were $declared",
        )
    }

    @Test
    @DisplayName("the source overrides nothing the platform reserves")
    fun theSourceOverridesNothingReserved() {
        // The bytecode check above is the authoritative one. This one names the mistake
        // a developer would actually make — writing `override fun getAnchor()` — so the
        // failure message points at the line rather than at a compiler flag.
        val source = factorySource.readText()
        for (member in forbiddenMembers) {
            assertFalse(
                Regex("""override\s+(fun|val)\s+$member\b""").containsMatchIn(source),
                "AnimoriaToolWindowFactory overrides `$member`, which the platform marks " +
                    "deprecated, experimental or internal. Configure it in plugin.xml instead.",
            )
        }
    }

    @Test
    @DisplayName("the tool window id is Animoria and nothing else keys on a different one")
    fun theIdIsStable() {
        assertEquals(
            "Animoria",
            toolWindow.getAttribute("id"),
            "the tool window id is a user-visible, settings-persisted identifier; changing it " +
                "silently resets every developer's window layout",
        )
    }

    @Test
    @DisplayName("anchor and icon are configured declaratively, not in Kotlin")
    fun anchorAndIconAreDeclarative() {
        // These are the two settings whose *only* supported home is the extension point:
        // `getAnchor()` and `getIcon()` on the factory are @ApiStatus.Internal. Asserting
        // they are present here is what makes removing the Kotlin overrides a no-op for
        // behaviour rather than a silent loss of placement and iconography.
        assertEquals(
            "right",
            toolWindow.getAttribute("anchor"),
            "the Animoria tool window docks on the right",
        )
        assertTrue(
            toolWindow.getAttribute("icon").isNotBlank(),
            "the tool window must declare an icon; without one the platform renders an " +
                "unlabelled blank stripe button",
        )
    }

    @Test
    @DisplayName("the registered factory class is the one that exists")
    fun theFactoryClassResolves() {
        val declaredClass = toolWindow.getAttribute("factoryClass")
        assertEquals(
            AnimoriaToolWindowFactory::class.java.name,
            declaredClass,
            "plugin.xml points at a factory class that is not the one in this source tree; " +
                "the tool window would fail to open with a ClassNotFoundException in the IDE log",
        )
        // Loadable, not merely named: a typo'd package passes a string comparison against
        // a matching typo and fails at plugin load.
        assertTrue(
            ToolWindowFactory::class.java.isAssignableFrom(Class.forName(declaredClass)),
            "$declaredClass must be loadable and implement ToolWindowFactory",
        )
    }

    @Test
    @DisplayName("startup and applicability keep the platform defaults")
    fun startupBehaviourIsUnchanged() {
        // Animoria has never restricted which projects it applies to, and has never asked
        // to be activated — or suppressed — at startup. Both were expressed by *inheriting*
        // `ToolWindowFactory`'s defaults, so the migration preserves them by continuing to
        // inherit rather than by re-stating them. If a future change wants different
        // behaviour, the supported route is a `conditionClass` here, and this test is where
        // that decision becomes visible.
        assertFalse(
            toolWindow.hasAttribute("conditionClass"),
            "no project applicability condition was declared in 1.0.1; adding one changes " +
                "which projects show the tool window",
        )
        assertEquals(
            "false",
            toolWindow.getAttribute("secondary").ifBlank { "false" },
            "the tool window belongs on the primary stripe, as it did in 1.0.1",
        )
    }

    @Test
    @DisplayName("the plugin stays dynamically loadable")
    fun thePluginRemainsDynamic() {
        // The Plugin Verifier's NOT_DYNAMIC level is the authority and is wired into
        // `pluginVerification.failureLevel`. This catches the single most common source of
        // a non-dynamic plugin at the point it is introduced, without needing a 10-minute
        // verifier run: components are the pre-2019 registration model and permanently
        // disqualify a plugin from being loaded without a restart.
        for (legacy in listOf("application-components", "project-components", "module-components")) {
            assertTrue(
                elements(legacy).isEmpty(),
                "<$legacy> makes the plugin non-dynamic; register a service or listener instead",
            )
        }
    }

    @Test
    @DisplayName("the supported IDE floor is 241 in both the descriptor and the build")
    fun theFloorIsPinnedInOnePlace() {
        // Two files can state the floor, so two files can disagree about it. `patchPluginXml`
        // writes the build's value over the descriptor's, which means a drift here does not
        // fail — it silently ships whichever one the build happened to win with.
        val ideaVersion =
            elements("idea-version").singleOrNull()
                ?: error("plugin.xml must declare exactly one <idea-version>")

        assertEquals(
            "241",
            ideaVersion.getAttribute("since-build"),
            "the supported floor is IntelliJ 2024.1; raising it drops every 2024.x user",
        )
        assertTrue(
            buildScript.readText().contains("""sinceBuild = "241""""),
            "build.gradle.kts must declare the same floor the descriptor does",
        )
        assertFalse(
            ideaVersion.hasAttribute("until-build"),
            "the plugin is deliberately open-ended; an until-build caps it at one IDE " +
                "release and un-installs it for everyone past that",
        )
        assertTrue(
            buildScript.readText().contains("untilBuild = provider { null }"),
            "the build must keep the range open-ended; without this the 2.x plugin derives " +
                "an until-build from the compile-time IDE",
        )
    }
}
