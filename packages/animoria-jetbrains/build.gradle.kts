plugins {
    kotlin("jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.17.2"
    kotlin("plugin.serialization") version "1.9.21"
    id("io.gitlab.arturbosch.detekt") version "1.23.3"
}

group = "com.sxnnyside.animoria"
version = "0.2.0"

repositories {
    mavenCentral()
}

detekt {
    toolVersion = "1.23.3"
    config.setFrom(files("config/detekt/detekt.yml"))
    buildUponDefaultConfig = true
}

intellij {
    pluginName.set("Animoria")
    version.set("2023.3")
    type.set("IC")
    updateSinceUntilBuild.set(false)
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
}

tasks {
    patchPluginXml {
        sinceBuild.set("233")
    }

    compileJava {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }

    compileKotlin {
        kotlinOptions.jvmTarget = "17"
    }
}
