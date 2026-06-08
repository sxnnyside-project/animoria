plugins {
    kotlin("jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.16.1"
}

group = "com.animoria"
version = "0.1.0"

repositories {
    mavenCentral()
}

intellij {
    pluginName.set("Animoria")
    version.set("2023.3")
    type.set("IC")
}

tasks {
    patchPluginXml {
        sinceBuild.set("233")
    }

    compileKotlin {
        kotlinOptions.jvmTarget = "17"
    }
}
