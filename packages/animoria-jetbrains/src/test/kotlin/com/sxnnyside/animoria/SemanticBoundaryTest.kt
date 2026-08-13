package com.sxnnyside.animoria

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.io.File

/**
 * The rule this whole migration exists to enforce, checked mechanically:
 * **the JetBrains client presents Core's decisions and makes none of its own.**
 *
 * ## Why source-level, and why repository-wide
 * A second governance model does not arrive as one large commit. It arrives as
 * one helper that seems easier to compute locally than to plumb through the
 * daemon — a health arithmetic here, a "reference count > 0" check there — and by
 * the time it is visible in behaviour it is spread across a dozen call sites.
 * These assertions scan *every* Kotlin source file, so a re-derivation cannot be
 * introduced anywhere in the plugin without failing the build.
 *
 * Comments are stripped before matching throughout: every fix in this codebase is
 * documented by describing the thing it replaced, so raw-text matching would flag
 * the explanations as though they were the defect.
 */
@DisplayName("JetBrains computes no governance semantics of its own")
class SemanticBoundaryTest {
    private val mainSourceRoot = File("src/main/kotlin")

    private fun kotlinSources(): List<File> {
        assertTrue(mainSourceRoot.exists(), "expected ${mainSourceRoot.absolutePath}")
        return mainSourceRoot.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
    }

    private fun stripComments(source: String): String =
        source
            .replace(Regex("""/\*.*?\*/""", RegexOption.DOT_MATCHES_ALL), "")
            .lines()
            .joinToString("\n") { line -> line.substringBefore("//") }

    /** Files whose stripped source matches `pattern`, as repo-relative paths. */
    private fun offenders(pattern: Regex): List<String> =
        kotlinSources()
            .filter { pattern.containsMatchIn(stripComments(it.readText())) }
            .map { it.relativeTo(mainSourceRoot).path }

    @Test
    @DisplayName("no health score is computed in Kotlin")
    fun noHealthArithmetic() {
        // The original defect: `100 - unused*5 - duplicates*10 - overused*5`, a
        // formula that disagreed with Core's weighted, severity-scaled score, so
        // the same workspace reported two different numbers depending on the IDE.
        val found = offenders(Regex("""100\s*[-−]\s*\w*(?:unused|duplicate|orphan)"""))
        assertTrue(found.isEmpty(), "health must come from Core, not be computed here: $found")
    }

    @Test
    @DisplayName("no confidence level is assigned in Kotlin")
    fun noConfidenceAssignment() {
        // Confidence is evidence-derived in Core and capped by scan coverage. A
        // literal assigned here would be an assertion with nothing behind it.
        val found = offenders(Regex("""confidence\s*=\s*"(?:certain|high|moderate|low)""""))
        assertTrue(found.isEmpty(), "confidence must come from Core: $found")
    }

    @Test
    @DisplayName("no coverage status is derived in Kotlin")
    fun noCoverageDerivation() {
        val found = offenders(Regex("""(?:coverage|scanCoverage)\s*=\s*"(?:complete|partial|none|unknown)""""))
        assertTrue(found.isEmpty(), "coverage must come from Core: $found")
    }

    @Test
    @DisplayName("no duplicate or orphan classification is performed in Kotlin")
    fun noClassification() {
        // `referenceCount == 0` in Kotlin is the client deciding what "orphaned"
        // means. That decision belongs to `no-unreferenced-assets`, which also
        // knows how much of the workspace was actually searched before saying so.
        val found = offenders(Regex("""referenceCount\s*[=!]=\s*0|contentHash\s*==\s*\w+\.contentHash"""))
        assertTrue(found.isEmpty(), "classification must come from Core: $found")
    }

    @Test
    @DisplayName("no reference scanning is performed in Kotlin")
    fun noReferenceScanning() {
        // The hover provider once matched references with `text.contains(stem)`,
        // which disagreed with the reference index in both directions.
        val found = offenders(Regex("""\.contains\((?:\w+\.)?stem\)"""))
        assertTrue(found.isEmpty(), "reference detection must come from Core: $found")
    }

    @Test
    @DisplayName("no cleanup classification is performed in Kotlin")
    fun noCleanupClassification() {
        val found = offenders(Regex(""""(?:orphaned|oversized|unreferenced|forbidden-format)"\s*(?:\)|,|$)"""))
        assertTrue(found.isEmpty(), "cleanup reasons must come from Core: $found")
    }

    @Test
    @DisplayName("no workspace file is deleted directly from Kotlin")
    fun noDirectDeletion() {
        // Every removal of a *developer's asset* must go through Core, which stages it
        // into a trash session with a manifest — the thing that makes a removal
        // undoable. A direct `File.delete()` bypasses that and is unrecoverable.
        //
        // The plugin's own extraction cache under `PathManager.getSystemPath()` is not
        // a workspace file: it is a ~100 MB copy of the bundled daemon that the plugin
        // wrote itself, and pruning superseded copies on upgrade is housekeeping, not
        // a removal a developer could want undone. Scoped by file rather than
        // suppressed, so the rule still covers every path that can reach a workspace.
        val cacheOwner = "backend/CoreProcessManager.kt"
        val found =
            offenders(Regex("""\.delete\(\)|\.deleteRecursively\(\)|Files\.delete"""))
                .filterNot { it.endsWith(cacheOwner) }
        assertTrue(found.isEmpty(), "removals must go through Core trash: $found")
    }

    @Test
    @DisplayName("the daemon cache prune stays inside the plugin's own directory")
    fun cachePruneIsScoped() {
        // The one file exempted above, held to what it was exempted for: the prune
        // must operate on a path derived from `PathManager`, never on a workspace root.
        val source =
            stripComments(
                File(mainSourceRoot, "com/sxnnyside/animoria/backend/CoreProcessManager.kt").readText(),
            )
        val prune = Regex("""fun pruneStaleExtractions[\s\S]{0,600}""").find(source)?.value ?: ""
        assertTrue(prune.isNotEmpty(), "pruneStaleExtractions must exist to be checked")
        assertTrue(
            source.contains("PathManager.getSystemPath()"),
            "the extraction root must come from the platform, not from a workspace path",
        )
        assertFalse(
            prune.contains("workspacePath") || prune.contains("root.path"),
            "the prune must never be pointed at a workspace",
        )
    }

    @Test
    @DisplayName("the deleted governance vocabulary does not reappear")
    fun noLegacyVocabulary() {
        val found =
            offenders(
                Regex("""\bGovernanceAnalyzer\b|\bGovernanceIssueData\b|\bGovernanceResultData\b|"overused""""),
            )
        assertTrue(found.isEmpty(), "legacy governance vocabulary reintroduced: $found")
    }

    @Test
    @DisplayName("no application state is injected as JavaScript source")
    fun noStateInjection() {
        // The original defect, in `AnimoriaGalleryPanel`:
        //
        //   val js = "if (window.animoriaUpdateData) window.animoriaUpdateData($payload);"
        //   browser.cefBrowser.executeJavaScript(js, "", 0)
        //
        // That is not a message channel — no envelope, no type, no validation, and no
        // way for the UI to reject a malformed update. It is also an injection
        // surface: `buildJsonObject` makes the JSON well-formed and says nothing about
        // the JavaScript source line the JSON is pasted into, so an asset path
        // containing a quote or a backslash terminates the string literal.
        //
        // The gate is narrow on purpose. `executeJavaScript` is not banned — the
        // shared panel uses it to hand the page a **base64 string**, whose alphabet
        // cannot contain a quote, a backslash or a newline, so that line's grammar
        // does not depend on the payload. What is banned is interpolating a JSON
        // object, a `buildJsonObject` result, or a serialized payload into the script.
        val found =
            offenders(
                Regex("""executeJavaScript\([^)]*\$\{?(?:payload|json|data|analysis|snapshot)"""),
            )
        assertTrue(
            found.isEmpty(),
            "host→UI state must travel through the message bridge, not as JavaScript source: $found",
        )
    }

    @Test
    @DisplayName("no product markup is authored in Kotlin")
    fun noInlineHtml() {
        // 1,322 lines of HTML, CSS and JavaScript lived in Kotlin string templates
        // across two panels: untyped, unlinted, and a third implementation of screens
        // that already existed twice. The product UI is `@animoria/ui` now; what is
        // still allowed here is the document skeleton that loads it, which is why the
        // check targets product markup rather than the `<html>` tag.
        val found = offenders(Regex("""fun getHtmlContent|class=\"asset-card|\.gallery-grid"""))
        assertTrue(found.isEmpty(), "product markup belongs in @animoria/ui: $found")
    }

    @Test
    @DisplayName("no host theme variable is emitted from a JetBrains IDE")
    fun noForeignThemeVariables() {
        // Both deleted panels mapped `JBColor` values onto `--vscode-*` names, because
        // the shared token layer was itself written in VS Code's vocabulary. The token
        // contract is host-neutral now; this plugin emits `--animoria-*` only.
        val found = offenders(Regex("""--vscode-"""))
        assertTrue(found.isEmpty(), "emit --animoria-* tokens, never a host's own: $found")
    }

    @Test
    @DisplayName("the inspection reads the cached analysis rather than deriving findings")
    fun inspectionIsAProjection() {
        val inspection =
            File(mainSourceRoot, "com/sxnnyside/animoria/inspections/AnimoriaGovernanceInspection.kt")
                .readText()

        assertTrue(
            inspection.contains("AnimoriaAnalysisHolder"),
            "the inspection must read the canonical analysis Core produced",
        )
        // It maps severity; it must not invent one.
        assertTrue(
            stripComments(inspection).contains("diagnostic.severity"),
            "severity must be read from the diagnostic",
        )
    }
}
