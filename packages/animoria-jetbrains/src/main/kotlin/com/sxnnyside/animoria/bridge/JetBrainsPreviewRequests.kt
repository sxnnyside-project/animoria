package com.sxnnyside.animoria.bridge

import com.intellij.openapi.project.Project
import com.sxnnyside.animoria.backend.CoreProcessManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import java.io.File
import java.util.Base64

/**
 * Everything the inspector needs to *show* an asset.
 *
 * ## Why this is its own class
 * It is the only part of the JetBrains bridge that reads files and decides how an
 * asset should be rendered; the rest translates one UI message into one daemon call.
 * Keeping both in one class pushed it past detekt's size budget, and the seam was
 * already there — this is where it was.
 *
 * ## What it still may not do
 * Classify. Which formats a browser animates is Core's list, the frame count comes
 * from the document Core read, and a file it cannot read falls back to the frame Core
 * rendered. Nothing here decides what an asset *is*.
 */
internal class JetBrainsPreviewRequests(
    private val project: Project,
    private val scope: CoroutineScope,
    private val post: (JsonObject) -> Unit,
) {
    private val json = Json { ignoreUnknownKeys = true }

    private fun manager(): CoreProcessManager = project.getService(CoreProcessManager::class.java)

    fun requestThumbnail(assetPath: String) {
        scope.launch {
            val response =
                runCatching {
                    manager().sendCommand("generateThumbnail", buildJsonObject { put("assetPath", assetPath) })
                }.getOrNull()
            val source = response?.jsonObject?.get("dataUri")?.jsonPrimitive?.contentOrNull
            post(
                buildJsonObject {
                    put("type", "thumbnail")
                    put("assetPath", assetPath)
                    put("source", source)
                },
            )
        }
    }

    /**
     * The inspector's preview for one asset.
     *
     * GIF, APNG and animated SVG animate from their own bytes in JCEF's Chromium, so
     * they are sent as the file; everything else is Core's rendered still with the
     * reason playback is not offered here. The classification is Core's list, not
     * this host's opinion — three hosts each deciding what "preview" means is how
     * they came to mean three different things.
     */
    fun requestAnimationData(assetPath: String) {
        scope.launch {
            val file = File(assetPath)
            val extension = file.extension.lowercase()
            val browserAnimated = extension in setOf("gif", "apng", "svg")

            // A Lottie is *played*, not pictured. Core reads the document — including
            // out of a `.lottie` archive — and the shared UI's player drives it, which
            // is what makes pause, scrubbing and speed possible at all. The migration
            // sent a still frame and a caption saying playback happens elsewhere.
            if (extension == "json" || extension == "lottie") {
                if (postLottieDocument(assetPath)) return@launch
            }

            val sourceUri =
                if (browserAnimated && file.isFile) {
                    runCatching {
                        val mime = MIME_BY_EXTENSION[extension] ?: "application/octet-stream"
                        "data:$mime;base64," + Base64.getEncoder().encodeToString(file.readBytes())
                    }.getOrNull()
                } else {
                    null
                }

            val stillUri =
                if (sourceUri == null) {
                    runCatching {
                        manager().sendCommand("generateThumbnail", buildJsonObject { put("assetPath", assetPath) })
                    }.getOrNull()?.jsonObject?.get("dataUri")?.jsonPrimitive?.contentOrNull
                } else {
                    null
                }

            val preview =
                when {
                    sourceUri != null ->
                        buildJsonObject {
                            put("kind", "image")
                            put("source", sourceUri)
                            put("animates", true)
                        }
                    stillUri != null ->
                        buildJsonObject {
                            put("kind", "still")
                            put("source", stillUri)
                            put("reason", "This format needs a player to animate. Open the file to play it.")
                        }
                    else ->
                        buildJsonObject {
                            put("kind", "unsupported")
                            put("reason", "Animoria could not render a frame for this file. Open it to inspect it.")
                        }
                }

            post(
                buildJsonObject {
                    put("type", "animation-data")
                    put("assetPath", assetPath)
                    put("preview", preview)
                    put("error", null as String?)
                },
            )
        }
    }

    /**
     * Posts a playable Lottie preview, or reports that there is none.
     *
     * Returns whether the document was sent, so the caller can fall through to the
     * still-frame path for a file Core could not read — a fallback that is a better
     * answer for an unusual file than an error the developer can do nothing about.
     */
    private suspend fun postLottieDocument(assetPath: String): Boolean {
        val document =
            runCatching {
                manager().sendCommand(
                    "getLottieDocument",
                    buildJsonObject { put("assetPath", assetPath) },
                )
            }.getOrNull()?.jsonObject ?: return false

        val animation = document["animation"]
        if (animation == null || animation is JsonNull) return false

        post(
            buildJsonObject {
                put("type", "animation-data")
                put("assetPath", assetPath)
                putJsonObject("preview") {
                    put("kind", "lottie")
                    put("animation", animation)
                    put("totalFrames", document["totalFrames"] ?: json.parseToJsonElement("0"))
                    put("frameRate", document["frameRate"] ?: json.parseToJsonElement("0"))
                }
                put("error", null as String?)
            },
        )
        return true
    }
}

/** Extensions JCEF renders inline. Anything else is not a previewable asset. */
private val MIME_BY_EXTENSION =
    mapOf(
        "gif" to "image/gif",
        "apng" to "image/apng",
        "png" to "image/png",
        "svg" to "image/svg+xml",
        "webp" to "image/webp",
        "avif" to "image/avif",
        "jpg" to "image/jpeg",
        "jpeg" to "image/jpeg",
        "jfif" to "image/jpeg",
    )
