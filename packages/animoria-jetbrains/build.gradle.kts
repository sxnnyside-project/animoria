import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.jetbrains.intellij.platform.gradle.tasks.VerifyPluginTask

plugins {
    kotlin("jvm") version "2.4.10"
    // The version is declared once, in `settings.gradle.kts`, because 2.x splits the
    // plugin into a settings half (repositories) and a project half (tasks) that must
    // agree. This is the replacement for `org.jetbrains.intellij` 1.17.4, which
    // JetBrains no longer develops.
    id("org.jetbrains.intellij.platform")
    kotlin("plugin.serialization") version "1.9.21"
    id("io.gitlab.arturbosch.detekt") version "1.23.3"
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0"
}

group = "com.sxnnyside.animoria"

// The release tag is the single source of truth for the published plugin version.
// `release.yml` exports ANIMORIA_VERSION from the tag and verifies it against every
// other versioned artifact before any publish step runs. The literal below is a
// local-development fallback only: it is deliberately NOT a real release version, so
// a plugin built without the environment variable can never be mistaken for — or
// published as — a release build.
version = System.getenv("ANIMORIA_VERSION") ?: "0.0.0-dev"

/**
 * The Plugin Verifier's per-category findings files, which are the input to
 * [verifyNoForbiddenPlatformApi]. Reading these rather than the one-line
 * `verification-verdict.txt` is what lets the gate attribute a finding to a class:
 * the verdict says "5 usages of deprecated API" and names nothing.
 */
val forbiddenApiReports =
    setOf(
        "internal-api-usages.txt",
        "experimental-api-usages.txt",
        "deprecated-usages.txt",
        "override-only-usages.txt",
        "non-extendable-api-usages.txt",
    )

/**
 * The fewest IDEs a run may cover before the gate treats its own result as meaningless.
 *
 * `recommended()` resolves to JetBrains' recommended releases from since-build 241 —
 * eight of them at the time of writing, and a number that grows on its own as JetBrains
 * ships. The point of the floor is not to pin that number but to refuse the failure mode
 * where the matrix resolves to one IDE, or none, and a green gate means only that almost
 * nothing was checked.
 */
val minimumVerifiedIdes = 4

// Repositories are declared in `settings.gradle.kts` under 2.x, because the IntelliJ
// Platform artifact repositories must be available to dependency resolution before
// this file is evaluated.

// The officially documented way (via the public Kotlin/Java Gradle DSL, not
// the task-implementation classes) to pin every compile task — main, test,
// Java, and Kotlin alike — to one JVM target. Replaces per-task-type wiring
// that only covered `compileJava`/`compileKotlin` by name and silently left
// `compileTestJava`/`compileTestKotlin` on whatever JDK was first on PATH.
kotlin {
    jvmToolchain(17)

    compilerOptions {
        // ## What this fixes
        // `ToolWindowFactory` is a *Kotlin* interface whose default members include
        // five the platform does not want plugins touching: `isApplicable` and
        // `isDoNotActivateOnStart` (deprecated), `manage` (experimental), and
        // `getAnchor`/`getIcon` (@ApiStatus.Internal).
        //
        // Animoria's source overrides none of them — `AnimoriaToolWindowFactory`
        // implements `createToolWindowContent` and nothing else. But in the default
        // `enable` mode the Kotlin compiler emits a *compatibility stub* into every
        // implementing class for each inherited default member, each one calling
        // `invokespecial` on the interface method. The Plugin Verifier reads bytecode,
        // so it correctly saw ten findings — an override and an invocation of each of
        // the five — in a class that mentions none of them. That is where 1.0.1's
        // entire internal/experimental/deprecated ToolWindowFactory report came from.
        //
        // ## Why this is the fix rather than a suppression
        // `no-compatibility` compiles interface defaults to real JVM default methods
        // and stops generating the stubs, so the class inherits those members instead
        // of re-declaring them. The findings disappear because the usage disappears —
        // nothing is hidden from the verifier, and no platform behaviour changes: an
        // inherited JVM default method and a stub that delegates to it do the same
        // thing at runtime.
        //
        // The IntelliJ Platform itself is compiled this way, which is why
        // `ToolWindowFactory` has no `DefaultImpls` class to fall back to.
        freeCompilerArgs.add("-jvm-default=no-compatibility")
    }
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

detekt {
    toolVersion = "1.23.3"
    config.setFrom(files("config/detekt/detekt.yml"))
    buildUponDefaultConfig = true
    // Grandfathers in complexity findings that predate CI enforcement of
    // detekt (see config/detekt/baseline.xml) — new violations still fail
    // the build; existing ones are tracked as known debt rather than
    // silently ignored or blocking this release on an unplanned refactor.
    baseline = file("config/detekt/baseline.xml")
}

tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
    jvmTarget = "17"
}

intellijPlatform {
    // The name of the distribution zip *and* of the directory the IDE unpacks it into
    // under `plugins/`. 1.x derived both from `intellij.pluginName`; 2.x derives them
    // from the Gradle project name unless told otherwise, which would have renamed the
    // artifact `animoria-jetbrains-<version>.zip` and the installed directory
    // `animoria-jetbrains/`. Stating it keeps 1.0.1's layout byte-for-byte, so an
    // upgrade lands where the previous install already is and `release.yml`'s
    // `distributions/*-<version>.zip` assertion keeps meaning what it meant.
    projectName = "Animoria"

    pluginConfiguration {
        name = "Animoria"

        ideaVersion {
            // The floor is unchanged from 1.0.1: IntelliJ 2024.1. Nothing in the 2.x
            // migration required raising it, and nothing here may raise it silently —
            // `ToolWindowContractTest` asserts this literal against the `<idea-version>`
            // in `plugin.xml`, so the two cannot drift apart.
            sinceBuild = "241"

            // Deliberately open-ended, which is what `updateSinceUntilBuild = false`
            // achieved under 1.x. Left unset, 2.x would derive an `until-build` from the
            // IDE this compiles against and cap the plugin at 2024.1.*, silently
            // un-installing it for every user on a later IDE.
            untilBuild = provider { null }
        }
    }

    pluginVerification {
        ides {
            // JetBrains' recommended releases across the declared `since-build`..open
            // range — the same selection 1.x used when no `ideVersions` were given, which
            // is the matrix 1.0.1 was actually verified against. Under 2.x it currently
            // resolves to eight IDEs (2024.1 through 2026.2) rather than 1.x's six,
            // because the range end is open and JetBrains has shipped since.
            //
            // Naming it makes the matrix a stated decision rather than an implicit
            // default, and `verifyNoForbiddenPlatformApi` refuses to pass on fewer than
            // `minimumVerifiedIdes`, so it cannot silently shrink to one.
            recommended()
        }

        // The verifier's own enforcement, used in preference to re-deriving the same
        // answer in Gradle. Under 1.x every one of these categories was *informational*:
        // the build went green while the plugin accumulated exactly the internal and
        // experimental usages that got 1.0.1 flagged. Listing them here makes the
        // verifier itself the thing that fails.
        //
        // `DEPRECATED_API_USAGES` is deliberately absent, and it is the only omission.
        // It cannot be enforced here because of the floor-forced constructor documented
        // at `floorForcedDeprecations`; `verifyNoForbiddenPlatformApi` enforces
        // deprecation instead, allowing that one signature and nothing else.
        failureLevel =
            listOf(
                VerifyPluginTask.FailureLevel.COMPATIBILITY_PROBLEMS,
                VerifyPluginTask.FailureLevel.INTERNAL_API_USAGES,
                VerifyPluginTask.FailureLevel.EXPERIMENTAL_API_USAGES,
                VerifyPluginTask.FailureLevel.OVERRIDE_ONLY_API_USAGES,
                VerifyPluginTask.FailureLevel.NON_EXTENDABLE_API_USAGES,
                VerifyPluginTask.FailureLevel.SCHEDULED_FOR_REMOVAL_API_USAGES,
                VerifyPluginTask.FailureLevel.PLUGIN_STRUCTURE_WARNINGS,
                VerifyPluginTask.FailureLevel.MISSING_DEPENDENCIES,
                VerifyPluginTask.FailureLevel.INVALID_PLUGIN,
                // The tool window is registered declaratively and holds no static state,
                // so the plugin is installable without a restart. If a change ever breaks
                // that, this is the line that says so.
                VerifyPluginTask.FailureLevel.NOT_DYNAMIC,
            )
    }

    publishing {
        // `publishPlugin` reads its token from this property, not from the environment
        // directly — release.yml sets JETBRAINS_PUBLISH_TOKEN in the step's env, but
        // nothing wired it to Gradle until this was added, so the task always failed
        // with "token property must be specified" regardless of whether the secret was
        // actually present.
        token = providers.environmentVariable("JETBRAINS_PUBLISH_TOKEN")
    }
}

dependencies {
    intellijPlatform {
        // The 2.x replacement for `intellij { version; type }`. Same IDE, same version.
        create(IntelliJPlatformType.IntellijIdeaCommunity, "2024.1")

        // markdown plugin for governance report rendering
        bundledPlugin("org.intellij.plugins.markdown")

        // Under 1.x the verifier tooling was fetched implicitly. 2.x makes it a
        // declared dependency, which is the reason the gate below can rely on it
        // being present rather than hoping it was downloaded.
        pluginVerifier()
    }

    // Not part of the IntelliJ Platform, so this one is genuinely the plugin's to ship.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // ## Why there is no kotlinx-coroutines dependency here
    // Coroutines ship *inside* the IntelliJ Platform, and the platform requires plugins
    // to use that copy: a plugin bundling its own gets a second, unrelated coroutines
    // runtime whose dispatchers do not participate in the IDE's structured concurrency.
    // 1.x reported this on every build (`The Kotlin Coroutines library should not be
    // added explicitly to the project`) and it was never acted on — 1.0.1 packages
    // kotlinx-coroutines-core 1.11.0 inside the distribution.
    //
    // ## Why the version cannot simply be pinned
    // Removing the bundled copy but *compiling* against 1.11.0 is worse than either
    // option, and the verifier caught it: `Job.cancel(cause = null)` compiles to a call
    // to the synthetic `Job.cancel$default`, which resolves against 1.11.0 and against
    // nothing in the platform's older coroutines. That is a `NoSuchMethodError` in
    // `CoreProcessManager.stop()` and `AnimoriaCoroutineScope.dispose()` — the daemon
    // shutdown path — on every supported IDE.
    //
    // Taking the dependency from the IntelliJ Platform itself is the only arrangement
    // where the version compiled against and the version present at runtime are the
    // same object. `intellijPlatform` above puts it on the compile classpath.

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    // Gradle bundles its own older junit-platform-launcher; without pinning one
    // explicitly here it stays on that stale version instead of the one the BOM
    // manages, and JUnit 6's engine refuses to run under the mismatch.
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

/**
 * Copies the built `@animoria/ui` bundle into the plugin's resources.
 *
 * ## Why the plugin cannot just read the workspace package
 * A plugin loads resources from its own jar. A path into a sibling pnpm package
 * exists on a developer's machine and nowhere else, so the panel would work in
 * `runIde` and be blank for every user — the class of failure that only shows up
 * after release.
 *
 * ## Why this fails the build rather than warning
 * The bundle *is* the plugin's UI. A jar without it is not a degraded plugin, it is
 * a broken one, and `AnimoriaSharedUiPanel` would render an empty rectangle with
 * nothing in the log to explain it.
 */
val copySharedUi by tasks.registering(Copy::class) {
    val uiDist = rootProject.file("../animoria-ui/dist")
    val uiStyles = rootProject.file("../animoria-ui/src/styles")

    doFirst {
        val bundle = File(uiDist, "animoria-ui.global.js")
        require(bundle.exists()) {
            "@animoria/ui is not built. Expected ${bundle.absolutePath}\n" +
                "Run: pnpm --filter @animoria/ui build"
        }
    }

    // The IIFE build, not the ESM one: JetBrains inlines the bundle into a document
    // it hands to JCEF, so there is no URL to `import` from and the exports must
    // arrive as a global.
    from(uiDist) { include("animoria-ui.global.js") }
    from(uiStyles) { include("tokens.css") }
    into(layout.buildDirectory.dir("generated-resources/web"))
}

/**
 * Refuses to package a plugin whose bundled daemon is missing or older than Core.
 *
 * ## The defect this exists for
 * `buildPlugin` had no dependency on the daemon at all. The binary is produced by
 * `pnpm --filter @animoria/core build:sea` and copied in by
 * `scripts/copy-sea-into-jetbrains.mjs` — two npm steps that Gradle knew nothing
 * about. So `./gradlew buildPlugin` happily packaged whatever binary happened to be
 * lying in `resources/native/`, including one built before the Core change the plugin
 * now depends on.
 *
 * That is exactly what shipped: a plugin calling `getUsageReferences` against a
 * daemon built before that method existed, reporting
 * `"getUsageReferences" is declared but not implemented in this build` — a message
 * that names the symptom and hides the cause, which is that the artifact is stale.
 *
 * ## Why staleness and not just presence
 * A missing binary is obvious the first time anyone runs the plugin. A *stale* one
 * works for every capability that has not changed, which is what makes it survive
 * manual testing and reach a release.
 */
val verifyBundledDaemon by tasks.registering {
    val nativeDir = file("src/main/resources/native")
    val coreDist = rootProject.file("../animoria-core/dist")

    doLast {
        val platforms = nativeDir.listFiles()?.filter { it.isDirectory }.orEmpty()
        require(platforms.isNotEmpty()) {
            "No bundled Animoria daemon found under ${nativeDir.absolutePath}. " +
                "Run: pnpm package:jetbrains-daemon"
        }

        if (!coreDist.exists()) return@doLast

        val newestCore =
            coreDist.walkTopDown().filter { it.isFile && it.extension == "js" }
                .maxOfOrNull { it.lastModified() } ?: return@doLast

        for (platform in platforms) {
            // build-sea.mjs names the Windows binary with a `.exe` suffix —
            // an unqualified "animoria-core" only ever matched the other
            // three platforms, so win32-x64 failed this check unconditionally.
            val binaryName = if (platform.name.startsWith("win32")) "animoria-core.exe" else "animoria-core"
            val binary = File(platform, binaryName)
            require(binary.exists()) {
                "The bundled daemon for ${platform.name} is missing its executable. " +
                    "Run: pnpm package:jetbrains-daemon"
            }
            require(binary.lastModified() >= newestCore) {
                "The bundled daemon for ${platform.name} is older than @animoria/core. " +
                    "It will refuse methods this plugin depends on, reporting them as " +
                    "declared-but-not-implemented. Run: pnpm package:jetbrains-daemon"
            }
        }
    }
}

/**
 * Runs the packaged daemon and requires it to answer what the plugin depends on.
 *
 * `verifyBundledDaemon` compares timestamps, which is reasoning about files. The only
 * thing that settles "does this binary implement `getUsageReferences`" is asking it,
 * and a build that ships a daemon nobody asked is how the reported failure survived
 * every previous gate.
 */
val verifyPackagedDaemon by tasks.registering(Exec::class) {
    dependsOn(verifyBundledDaemon)
    workingDir = rootProject.file("../..")
    commandLine("node", "scripts/verify-packaged-daemon.mjs")
}

tasks.named("buildPlugin") {
    dependsOn(verifyBundledDaemon, verifyPackagedDaemon)
}

/**
 * The one deprecated platform API Animoria cannot stop calling at its supported floor.
 *
 * `FileChooserFactory.createSaveFileDialog` needs a [FileSaverDescriptor], and across
 * the verified matrix the constructor situation is split exactly down the middle:
 *
 * | IDE            | available constructors                                      |
 * | :------------- | :---------------------------------------------------------- |
 * | 2024.1–2024.3  | `(String, String, String...)` **only** — not deprecated      |
 * | 2025.1–2025.3  | that one, now deprecated, plus `(String, String)` and others |
 *
 * The replacements landed in 2025.1. There is no constructor that exists at the 241
 * floor and is undeprecated at 253, so one compiled artifact spanning 241..∞ must call
 * a constructor that some IDE in the range calls deprecated. The alternatives were all
 * worse than the finding: reflection and `@Suppress` are forbidden outright, raising
 * `since-build` to 251 would drop every 2024.x user to silence a warning, and replacing
 * the native save dialog with a folder picker plus a text prompt would degrade a
 * working feature.
 *
 * So it is allowed here — by exact signature, in one place, visible in the build log on
 * every run — and nowhere else. [verifyNoForbiddenPlatformApi] fails if this string
 * stops matching a real finding, so when the floor eventually moves past 2025.1 the
 * exemption becomes a build failure rather than a comment nobody deletes.
 */
val floorForcedDeprecations =
    listOf(
        "com.intellij.openapi.fileChooser.FileSaverDescriptor.<init>(java.lang.String title, " +
            "java.lang.String description, java.lang.String[] extensions)",
    )

/**
 * Fails the build when Animoria's own code uses a forbidden IntelliJ API.
 *
 * ## What the verifier already enforces, and what this adds
 * `pluginVerification.failureLevel` above is the primary gate: internal, experimental,
 * override-only, non-extendable and scheduled-for-removal usages fail inside the
 * verifier itself, with no list maintained here. This task exists for the two things
 * `failureLevel` cannot express.
 *
 * The first is **attribution**. `failureLevel` is all-or-nothing per category, and
 * deprecation findings can arrive from a bundled JetBrains dependency rather than from
 * Animoria. Only findings naming a `com.sxnnyside.animoria` class are treated as ours;
 * the rest are printed, classified, and not hidden.
 *
 * The second is **non-vacuity**. The gate this replaces read only the one-line verdict
 * files, hung off a task CI never invoked, and would have passed happily against an empty
 * report directory. Here, an empty report directory and a matrix that resolved to fewer
 * IDEs than [minimumVerifiedIdes] are both explicit failures, and a documented allowance
 * that stops matching anything is a third — so the gate cannot go quiet by finding
 * nothing to look at.
 */
val verifyNoForbiddenPlatformApi by tasks.registering {
    val verify = tasks.named("verifyPlugin")
    dependsOn(verify)

    val buildDir = layout.buildDirectory
    val allowed = floorForcedDeprecations
    val ourPackage = "com.sxnnyside.animoria"

    doLast {
        // Reports are located by filename rather than by a hard-coded path: 2.x moved
        // the report directory once already, and a gate that silently finds nothing when
        // the layout changes is worse than no gate.
        //
        // Coverage is measured from the *verdict* files, not the findings files. The
        // verifier writes one verdict per IDE unconditionally, but writes a findings file
        // only when that IDE has something to report — so counting findings would mean
        // the cleaner the plugin, the less verified it appears, and a plugin with no
        // findings at all would fail this task for having succeeded. That is not
        // hypothetical: it is what this task did on the run that produced this comment,
        // reporting 5 IDEs when 8 had been verified and 3 were simply clean.
        val root = buildDir.get().asFile
        val verdicts =
            root.walkTopDown().filter { it.isFile && it.name == "verification-verdict.txt" }.toList()

        require(verdicts.isNotEmpty()) {
            "The Plugin Verifier produced no verdicts. The gate cannot pass vacuously — " +
                "run `verifyPlugin` and check that it resolved any IDEs at all."
        }

        // …/<ide>/plugins/<plugin-id>/<version>/<file>.txt
        val ides = verdicts.map { it.parentFile.parentFile.parentFile.parentFile.name }.toSet()
        require(ides.size >= minimumVerifiedIdes) {
            "The verifier covered only ${ides.size} IDE(s) (${ides.sorted().joinToString()}). " +
                "The declared matrix is JetBrains' recommended releases from since-build 241, " +
                "which is several; a shrunken matrix would pass this gate for the wrong reason."
        }

        val findings =
            root.walkTopDown().filter { it.isFile && it.name in forbiddenApiReports }.toList()

        val ours = mutableListOf<String>()
        val theirs = mutableListOf<String>()
        val matchedAllowances = mutableSetOf<String>()

        for (report in findings) {
            val ide = report.parentFile.parentFile.parentFile.parentFile.name
            for (line in report.readLines().map { it.trim() }.filter { it.isNotEmpty() }) {
                val allowance = allowed.firstOrNull { line.contains(it) }
                when {
                    allowance != null -> matchedAllowances += allowance
                    line.contains(ourPackage) -> ours += "$ide [${report.nameWithoutExtension}] $line"
                    else -> theirs += "$ide [${report.nameWithoutExtension}] $line"
                }
            }
        }

        // An allowance that no longer matches anything is not harmless: it is a licence
        // to reintroduce the usage that nobody would notice was still open. When the
        // floor moves past 2025.1 this is the line that makes someone delete it.
        val stale = allowed - matchedAllowances
        require(stale.isEmpty()) {
            "These documented deprecation allowances no longer match any verifier finding. " +
                "The underlying API usage is gone, so the allowance must be deleted from " +
                "`floorForcedDeprecations`:\n" + stale.joinToString("\n") { "  - $it" }
        }

        if (theirs.isNotEmpty()) {
            // Classified, never hidden: these are real findings that Animoria's source
            // cannot act on, so failing the build on them would only teach people to
            // weaken the gate.
            logger.lifecycle(
                "verifyNoForbiddenPlatformApi: ${theirs.size} finding(s) attributable to a " +
                    "JetBrains dependency rather than to Animoria:",
            )
            theirs.forEach { logger.lifecycle("  $it") }
        }

        require(ours.isEmpty()) {
            "Animoria code uses IntelliJ APIs it must not. Each of these names an Animoria " +
                "class and is the plugin's own to fix — not to suppress, wrap, or reach by " +
                "reflection:\n" + ours.joinToString("\n") { "  $it" }
        }

        logger.lifecycle(
            "verifyNoForbiddenPlatformApi: ${ides.size} IDE(s) verified " +
                "(${ides.sorted().joinToString()}); no internal, experimental or deprecated " +
                "platform API attributable to Animoria, besides " +
                "${matchedAllowances.size} documented floor-forced deprecation(s).",
        )
    }
}

// `verifyPlugin` is what CI runs; the gate has to hang off it or it is documentation.
// The task it replaced was wired to nothing and had never once executed in CI.
tasks.named("verifyPlugin") {
    finalizedBy(verifyNoForbiddenPlatformApi)
}

sourceSets {
    named("main") {
        resources.srcDir(layout.buildDirectory.dir("generated-resources"))
    }
}

tasks.named("processResources") {
    dependsOn(copySharedUi)
}

// `patchPluginXml`'s since/until settings and `publishPlugin`'s token both moved into
// the `intellijPlatform { }` block above — that is where 2.x expects plugin metadata
// and credentials to be declared, and duplicating them here would give two sources of
// truth for the supported IDE range.
tasks {
    test {
        useJUnitPlatform()
    }
}
