package com.sxnnyside.animoria.backend

import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlin.coroutines.CoroutineContext

/**
 * The project-owned coroutine scope every Animoria background operation launches into.
 *
 * Implements [Disposable] and [CoroutineScope] with a project-lifetime [SupervisorJob].
 * The platform disposes this service when the project closes, cancelling all coroutines
 * launched into it.
 */
@Service(Service.Level.PROJECT)
class AnimoriaCoroutineScope : Disposable, CoroutineScope {
    private val job = SupervisorJob()
    override val coroutineContext: CoroutineContext = job + Dispatchers.Default

    override fun dispose() {
        job.cancel()
    }

    companion object {
        /** The scope to launch Animoria background work into for this project. */
        fun of(project: Project): CoroutineScope = project.service<AnimoriaCoroutineScope>()
    }
}
