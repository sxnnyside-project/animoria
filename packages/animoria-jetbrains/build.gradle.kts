plugins {
    kotlin("jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.17.2"
    kotlin("plugin.serialization") version "1.9.21"
    id("io.gitlab.arturbosch.detekt") version "1.23.3"
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0"
}

group = "com.sxnnyside.animoria"
version = "1.0.0"

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

tasks {
    patchPluginXml {
        sinceBuild.set("241")
    }

    test {
        useJUnitPlatform()
    }
}
