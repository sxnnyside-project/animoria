package com.sxnnyside.animoria.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

/**
 * Persistent settings for the Animoria plugin, stored per-project in
 * `.idea/animoria.xml`.
 *
 * Mirrors the VS Code configuration schema:
 * - `animoria.enableThumbnails` → [enableThumbnails]
 *
 * ## API
 * Access via `AnimoriaSettings.getInstance(project)`.
 *
 * ## Persistence
 * IntelliJ's `PersistentStateComponent` serializes the state class via
 * XML bean binding. Fields must be `var` with default values for correct
 * round-trip serialization.
 */
@State(
    name = "AnimoriaSettings",
    storages = [Storage("animoria.xml")],
)
@Service(Service.Level.PROJECT)
class AnimoriaSettings : PersistentStateComponent<AnimoriaSettings.State> {
    data class State(
        /** Generate and display static thumbnail previews for animated assets. */
        var enableThumbnails: Boolean = true,
        // ── Shared UI view preferences ──
        //
        // Persisted here rather than in the webview, because the shared UI has no
        // storage and must not acquire any: a component that remembers things across
        // hosts is a component that behaves differently in each of them. The host
        // owns persistence and echoes the stored value back, so what the panel renders
        // is always what was actually saved.
        var playbackSpeed: Double = 1.0,
        var previewBackground: String = "transparent",
        var locale: String = "en",
        var assetViewMode: String = "flat",
        /**
         * Cleanup candidates the developer has set aside.
         *
         * A host preference, not a Core fact: Core reports that an asset is
         * unreferenced and that stays true. What this records is that this developer,
         * in this project, has already decided about it.
         */
        var dismissedCleanupPaths: MutableList<String> = mutableListOf(),
    )

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    val enableThumbnails: Boolean get() = state.enableThumbnails

    var playbackSpeed: Double
        get() = state.playbackSpeed
        set(value) {
            state.playbackSpeed = value
        }

    var previewBackground: String
        get() = state.previewBackground
        set(value) {
            state.previewBackground = value
        }

    var locale: String
        get() = state.locale
        set(value) {
            state.locale = value
        }

    var assetViewMode: String
        get() = state.assetViewMode
        set(value) {
            state.assetViewMode = value
        }

    val dismissedCleanupPaths: List<String> get() = state.dismissedCleanupPaths.toList()

    fun setDismissed(
        assetPath: String,
        dismissed: Boolean,
    ) {
        if (dismissed) {
            if (assetPath !in state.dismissedCleanupPaths) state.dismissedCleanupPaths.add(assetPath)
        } else {
            state.dismissedCleanupPaths.remove(assetPath)
        }
    }

    companion object {
        fun getInstance(project: Project): AnimoriaSettings = project.getService(AnimoriaSettings::class.java)
    }
}
