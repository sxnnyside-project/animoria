// IntelliJ Platform Gradle Plugin 2.x resolves the IDE it compiles against through
// its own repository layer, and that layer has to exist before any project is
// configured — which is why the 2.x model puts it here rather than in
// `build.gradle.kts`. Under 1.x the plugin injected these repositories implicitly;
// declaring them is the visible half of the migration.
import org.jetbrains.intellij.platform.gradle.extensions.intellijPlatform

plugins {
    id("org.jetbrains.intellij.platform.settings") version "2.11.0"
}

rootProject.name = "animoria-jetbrains"

dependencyResolutionManagement {
    repositories {
        mavenCentral()

        intellijPlatform {
            defaultRepositories()
        }
    }
}
