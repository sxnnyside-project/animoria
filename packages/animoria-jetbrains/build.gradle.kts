plugins {
    kotlin("jvm") version "2.4.10"
    id("org.jetbrains.intellij") version "1.17.2"
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

repositories {
    mavenCentral()
}

// The officially documented way (via the public Kotlin/Java Gradle DSL, not
// the task-implementation classes) to pin every compile task — main, test,
// Java, and Kotlin alike — to one JVM target. Replaces per-task-type wiring
// that only covered `compileJava`/`compileKotlin` by name and silently left
// `compileTestJava`/`compileTestKotlin` on whatever JDK was first on PATH.
kotlin {
    jvmToolchain(17)
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

intellij {
    pluginName.set("Animoria")
    version.set("2024.1")
    type.set("IC")
    updateSinceUntilBuild.set(false)
    // markdown plugin for governance report rendering
    plugins.set(listOf("org.intellij.plugins.markdown"))
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
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
            val binary = File(platform, "animoria-core")
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
 * Fails the verification when the plugin touches an internal IntelliJ API.
 *
 * ## Why this is a gate and not a warning
 * Animoria has been rejected from the Marketplace once for exactly this, and the
 * verifier reports internal usage as *informational* — the build stays green while the
 * plugin becomes unpublishable. Two findings were live when this was written:
 * `com.intellij.ui.AnimatedIcon.FS` (`@ApiStatus.Internal`) in the tree renderer, and
 * `com.intellij.testFramework.LightVirtualFile` — a **test-only** module — in the
 * governance report editor.
 *
 * `runPluginVerifier` is the authority; this reads its own report rather than
 * re-deriving the answer by grep, which cannot know what JetBrains has annotated.
 */
val verifyNoInternalApi by tasks.registering {
    dependsOn(tasks.named("runPluginVerifier"))

    doLast {
        val reports = layout.buildDirectory.dir("reports/pluginVerifier").get().asFile
        require(reports.isDirectory) { "No plugin verifier report at ${reports.absolutePath}" }

        val verdicts =
            reports.walkTopDown().filter { it.isFile && it.name == "verification-verdict.txt" }.toList()
        require(verdicts.isNotEmpty()) {
            "The verifier produced no verdicts — the gate would pass vacuously."
        }

        val offenders =
            verdicts
                .map { it to it.readText().trim() }
                .filter { (_, verdict) -> verdict.contains("internal API", ignoreCase = true) }
                .map { (file, verdict) ->
                    // …/pluginVerifier/<ide>/plugins/<id>/<version>/verification-verdict.txt
                    val ide = file.parentFile.parentFile.parentFile.parentFile.name
                    "$ide: $verdict"
                }

        require(offenders.isEmpty()) {
            "The plugin uses internal IntelliJ APIs and would be rejected from the Marketplace:\n" +
                offenders.joinToString("\n")
        }

        logger.lifecycle("verifyNoInternalApi: ${verdicts.size} IDE build(s), no internal API usage")
    }
}

sourceSets {
    named("main") {
        resources.srcDir(layout.buildDirectory.dir("generated-resources"))
    }
}

tasks.named("processResources") {
    dependsOn(copySharedUi)
}

tasks {
    patchPluginXml {
        sinceBuild.set("241")
    }

    test {
        useJUnitPlatform()
    }
}
