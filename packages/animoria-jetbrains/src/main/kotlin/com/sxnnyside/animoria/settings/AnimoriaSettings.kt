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
 * - `animoria.governance.overusedThreshold` → [overusedThreshold]
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
        /**
         * Number of source-file references at or above which an asset is
         * flagged as overused in the Governance report.
         */
        var overusedThreshold: Int = 10,
    )

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    val enableThumbnails: Boolean get() = state.enableThumbnails
    val overusedThreshold: Int get() = state.overusedThreshold

    companion object {
        fun getInstance(project: Project): AnimoriaSettings = project.getService(AnimoriaSettings::class.java)
    }
}
