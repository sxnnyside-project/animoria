package com.sxnnyside.animoria.bridge

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import com.sxnnyside.animoria.actions.AnimoriaActionHost
import com.sxnnyside.animoria.backend.AnimoriaAnalysisHolder
import com.sxnnyside.animoria.backend.AnimoriaCoroutineScope
import com.sxnnyside.animoria.backend.CoreProcessManager
import com.sxnnyside.animoria.logging.AnimoriaLogger
import com.sxnnyside.animoria.settings.AnimoriaSettings
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import java.awt.datatransfer.StringSelection
import java.io.File

/**
 * JetBrains' implementation of the shared UI's host contract.
 *
 * ## What this is
 * A translator between `HostOutbound` and native IntelliJ APIs plus daemon commands.
 * It computes nothing: every fact it forwards came from `@animoria/core` through the
 * NDJSON daemon, and `SemanticBoundaryTest` fails the build if Kotlin starts
 * classifying assets, scoring health, or matching references again.
 *
 * ## Plans by id, same as VS Code
 * A `ResolutionPlan` or `CleanupPlan` is built by Core, held here against the id the
 * UI was shown, and applied by that id. The UI can neither edit a plan between
 * preview and apply nor construct one — which is what makes "what you saw is what
 * ran" structural rather than a convention. The plans themselves live in the daemon;
 * this holds the id mapping so a forged id cannot reach an executor.
 *
 * ## Native surfaces stay native
 * Navigation is `OpenFileDescriptor`. Confirmation is `Messages.showYesNoDialog`.
 * Notification is the platform's. A webview-rendered confirmation would be a page
 * element the same page could dismiss, and destructive confirmation is a platform
 * concern in every host.
 */
class JetBrainsHostBridge(
    private val project: Project,
    private val post: (JsonObject) -> Unit,
) : Disposable {
    private val json =
        Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }
    private val scope = AnimoriaCoroutineScope.of(project)

    /**
     * Thumbnails and previews, which are their own concern.
     *
     * Split out because they are the only part of this bridge that reads *files* and
     * decides how an asset should be shown — everything else translates one message
     * into one daemon call. Keeping them here pushed the class past the size detekt
     * allows, and the split follows the seam that was already there.
     */
    private val previews by lazy { JetBrainsPreviewRequests(project, scope, post) }

    /** Plan ids this bridge issued. A message naming anything else is refused. */
    private val issuedCleanupPlans = mutableSetOf<String>()
    private val issuedResolutionPlans = mutableSetOf<String>()

    private var disposed = false

    /** Handles one raw message from the UI. Never throws. */
    fun handle(raw: String) {
        if (disposed) return

        val message =
            runCatching { json.parseToJsonElement(raw).jsonObject }
                .getOrElse {
                    AnimoriaLogger.warn("Animoria: ignored an unparseable UI message")
                    return
                }

        val type = message["type"]?.jsonPrimitive?.contentOrNull
        if (type == null) {
            AnimoriaLogger.warn("Animoria: ignored a UI message with no type")
            return
        }

        // Split by concern rather than one long `when`: the two groups have different
        // safety properties. Everything in `handleNavigation` is read-only and can run
        // immediately; everything in `handleWorkflow` reaches Core and, for the apply
        // paths, a confirmation.
        if (handleNavigation(type, message)) return
        if (handleWorkflow(type, message)) return
        AnimoriaLogger.warn("Animoria: ignored an unrecognized UI message \"$type\"")
    }

    /** Read-only messages. Returns true when handled. */
    private fun handleNavigation(
        type: String,
        message: JsonObject,
    ): Boolean {
        when (type) {
            "ready" -> {
                post(capabilities())
                post(preferences())
                publishAnalysis()
            }
            "run-analysis" -> AnimoriaActionHost.of(project).refreshAnalysis()
            "open-asset" -> openFile(message.stringField("assetPath"), line = null)
            "reveal-asset" -> revealInFileManager(message.stringField("assetPath"))
            "open-reference" ->
                openFile(
                    message.stringField("file"),
                    // 1-based on the contract, 0-based in the platform.
                    line = (message["line"]?.jsonPrimitive?.int ?: 1) - 1,
                )
            "copy-to-clipboard" -> copyToClipboard(message.stringField("text"))
            "request-thumbnail" -> previews.requestThumbnail(message.stringField("assetPath"))
            else -> return false
        }
        return true
    }

    /** Messages that reach Core. Returns true when handled. */
    private fun handleWorkflow(
        type: String,
        message: JsonObject,
    ): Boolean {
        when (type) {
            "request-cleanup-proposal" -> requestCleanupProposal()
            "request-cleanup-plan" -> requestCleanupPlan(message)
            "apply-cleanup-plan" -> applyCleanupPlan(message)
            "request-resolution-plan" -> requestResolutionPlan(message)
            "apply-resolution-plan" -> applyResolutionPlan(message)
            "request-trash-sessions" -> requestTrashSessions()
            "restore-session" -> restoreSession(message.stringField("sessionId"))
            "request-animation-data" -> previews.requestAnimationData(message.stringField("assetPath"))
            "request-usage-references" -> requestUsageReferences(message.stringField("assetPath"))
            "generate-snippet" -> generateSnippet(message.stringField("assetPath"))
            "save-preferences" -> savePreferences(message)
            "dismiss-cleanup-candidate" ->
                dismissCleanupCandidate(
                    message.stringField("assetPath"),
                    message.booleanField("dismissed"),
                )
            else -> return false
        }
        return true
    }

    /**
     * What this host can do.
     *
     * Every field is a real IntelliJ API this class holds. Declaring a capability the
     * host cannot honour would make the UI offer a control that silently does nothing
     * — worse than a disabled one, which at least states its reason.
     */
    private fun capabilities(): JsonObject =
        buildJsonObject {
            put("type", "capabilities")
            putJsonObject("capabilities") {
                put("canMutate", true)
                put("canRestore", true)
                put("canRevealInFileManager", true)
                put("canOpenReference", true)
                put("canGenerateSnippet", true)
                put("canCopyToClipboard", true)
                put("mutationUnavailableReason", null as String?)
            }
        }

    /** Pushes the latest canonical analysis, or a progress message when none exists yet. */
    fun publishAnalysis() {
        val holder = AnimoriaAnalysisHolder.of(project)
        // Forwarded verbatim. Re-encoding the plugin's flattened model produced a
        // payload with no `roots`, no `lifecycle` and no `freshness` — none of which
        // the shared UI's view model can be built without.
        val canonical = holder.currentCanonical()
        if (canonical != null) {
            post(
                buildJsonObject {
                    put("type", "analysis")
                    put("analysis", canonical)
                },
            )
            return
        }

        run {
            post(
                buildJsonObject {
                    put("type", "analysis-progress")
                    putJsonObject("readiness") {
                        put("assetsIndexed", false)
                        put("referencesResolved", false)
                        put("duplicatesResolved", false)
                        put("complete", false)
                    }
                    put("message", "Waiting for the Animoria engine…")
                },
            )
        }
    }

    /**
     * Sends the developer to the surface their action was about.
     *
     * Contextual routing, and the reason it is a message: the tool window is a
     * singleton, so every action after the first reaches an already-mounted UI.
     * "Review Cleanup" used to call `focusToolWindow()` and nothing else — the
     * developer arrived wherever they had left the panel, which for a first-time
     * click is the assets grid.
     */
    fun publishFocus(
        tab: String,
        assetPath: String? = null,
        groupId: String? = null,
        rootId: String = "",
    ) {
        post(
            buildJsonObject {
                put("type", "focus")
                put("tab", tab)
                put("assetPath", assetPath)
                put("groupId", groupId)
                put("rootId", rootId)
            },
        )
    }

    override fun dispose() {
        disposed = true
        issuedCleanupPlans.clear()
        issuedResolutionPlans.clear()
    }

    // ── Native surfaces ────────────────────────────────────────────────────────

    private fun openFile(
        path: String,
        line: Int?,
    ) {
        if (path.isEmpty()) return
        val file = LocalFileSystem.getInstance().findFileByIoFile(File(path)) ?: return
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) return@invokeLater
            OpenFileDescriptor(project, file, line ?: 0, 0).navigate(true)
        }
    }

    private fun revealInFileManager(path: String) {
        if (path.isEmpty()) return
        ApplicationManager.getApplication().invokeLater {
            com.intellij.ide.actions.RevealFileAction.openFile(File(path))
        }
    }

    private fun copyToClipboard(text: String) {
        if (text.isEmpty()) return
        CopyPasteManager.getInstance().setContents(StringSelection(text))
    }

    /**
     * Asks the developer, on the EDT, and runs [onConfirmed] only if they agree.
     *
     * Native rather than in-page, for the same reason VS Code uses a modal: a
     * destructive confirmation rendered by the page can be dismissed by the page.
     */
    private fun confirm(
        title: String,
        detail: String,
        onCancelled: () -> Unit = {},
        onConfirmed: () -> Unit,
    ) {
        ApplicationManager.getApplication().invokeLater {
            if (project.isDisposed) {
                onCancelled()
                return@invokeLater
            }
            val answer =
                Messages.showYesNoDialog(project, detail, title, "Proceed", "Cancel", Messages.getWarningIcon())
            if (answer == Messages.YES) onConfirmed() else onCancelled()
        }
    }

    // ── Daemon ─────────────────────────────────────────────────────────────────

    /**
     * Every daemon method this bridge is allowed to call.
     *
     * Named constants rather than string literals at the call sites, because that is
     * exactly what went wrong: this bridge called `cleanupProposal`, `resolveDuplicates`
     * and `restoreTrash`, none of which the protocol declares. All three returned
     * `unsupported-method` at runtime, so cleanup, duplicate resolution and restore
     * were dead in this client from their first click while every test stayed green —
     * `ProtocolConformanceTest` checked the *envelope* and never the vocabulary.
     * `DaemonVocabularyTest` now checks these against `@animoria/core`'s `DAEMON_METHODS`.
     */
    private object Method {
        const val BUILD_CLEANUP_PROPOSAL = "buildCleanupProposal"
        const val BUILD_CLEANUP_PLAN = "buildCleanupPlan"
        const val APPLY_CLEANUP_PLAN = "applyCleanupPlan"
        const val BUILD_RESOLUTION_PLAN = "buildResolutionPlan"
        const val APPLY_RESOLUTION_PLAN = "applyResolutionPlan"
        const val LIST_TRASH_SESSIONS = "listTrashSessions"
        const val RESTORE_TRASH_SESSION = "restoreTrashSession"
        const val GENERATE_THUMBNAIL = "generateThumbnail"
        const val GENERATE_SNIPPET = "generateSnippet"
        const val GET_USAGE_REFERENCES = "getUsageReferences"
        const val GET_LOTTIE_DOCUMENT = "getLottieDocument"
    }

    /**
     * Which root each trash session came from.
     *
     * `restoreTrashSession` needs it: a session lives in `.animoria/trash/` *under a
     * root*, so restoring without one cannot find the directory. The previous call
     * omitted it entirely, which the daemon rejects as `invalid-params`.
     */
    private val rootIdByTrashSession = mutableMapOf<String, String>()

    /** Sends one command, or reports the failure to the UI. Returns null on failure. */
    private suspend fun call(
        method: String,
        params: JsonObject = buildJsonObject {},
        failureMessage: String,
    ): JsonElement? =
        runCatching { manager().sendCommand(method, params) }.getOrElse { error ->
            AnimoriaLogger.warn("Animoria: $method failed — ${error.message}")
            postError(error.message ?: failureMessage)
            null
        }

    /**
     * Where one asset is used, from Core's reference index.
     *
     * The capability `getUsageReferences` was declared for and never implemented. It
     * is also what the deleted editor hover needed and did not have: that listener
     * matched asset stems against source text in Kotlin, and documented itself as an
     * approximation, because nothing authoritative was reachable.
     */
    private fun requestUsageReferences(assetPath: String) {
        scope.launch {
            val response =
                call(
                    Method.GET_USAGE_REFERENCES,
                    buildJsonObject { put("assetPath", assetPath) },
                    "Could not read this asset's usages.",
                ) ?: return@launch

            post(
                buildJsonObject {
                    put("type", "usage-references")
                    put("assetPath", assetPath)
                    put("references", response.jsonObject["references"] ?: buildJsonArray {})
                    // An unfinished scan says so rather than presenting an empty list
                    // as the finding "used nowhere".
                    put("complete", response.jsonObject["complete"] ?: json.parseToJsonElement("false"))
                },
            )
        }
    }

    /** The stored view preferences, in the shape the contract names. */
    private fun preferences(): JsonObject {
        val settings = AnimoriaSettings.getInstance(project)
        return buildJsonObject {
            put("type", "preferences")
            putJsonObject("preferences") {
                put("playbackSpeed", settings.playbackSpeed)
                put("previewBackground", settings.previewBackground)
                put("locale", settings.locale)
                put("assetViewMode", settings.assetViewMode)
            }
        }
    }

    /**
     * Stores view preferences, then echoes what was stored.
     *
     * Echoed rather than assumed: the UI renders the host's answer, so a preference
     * that failed to persist cannot appear to have worked.
     */
    private fun savePreferences(message: JsonObject) {
        val incoming = message["preferences"]?.jsonObject ?: return
        val settings = AnimoriaSettings.getInstance(project)
        incoming["playbackSpeed"]?.jsonPrimitive?.let {
            runCatching { it.double }.getOrNull()?.let { speed -> settings.playbackSpeed = speed }
        }
        incoming["previewBackground"]?.jsonPrimitive?.contentOrNull?.let { settings.previewBackground = it }
        incoming["locale"]?.jsonPrimitive?.contentOrNull?.let { settings.locale = it }
        incoming["assetViewMode"]?.jsonPrimitive?.contentOrNull?.let { settings.assetViewMode = it }
        post(preferences())
    }

    /**
     * Sets a cleanup candidate aside, or brings it back, then rebuilds the proposal.
     *
     * Rebuilt rather than patched: the developer must see the list Core would produce
     * now, not the previous list with a row hidden.
     */
    private fun dismissCleanupCandidate(
        assetPath: String,
        dismissed: Boolean,
    ) {
        AnimoriaSettings.getInstance(project).setDismissed(assetPath, dismissed)
        requestCleanupProposal()
    }

    private fun requestCleanupProposal() {
        scope.launch {
            val dismissed = AnimoriaSettings.getInstance(project).dismissedCleanupPaths
            val response =
                call(
                    Method.BUILD_CLEANUP_PROPOSAL,
                    buildJsonObject {
                        put("dismissedPaths", buildJsonArray { dismissed.forEach { add(it) } })
                    },
                    "Could not build a cleanup proposal.",
                ) ?: return@launch
            post(
                buildJsonObject {
                    put("type", "cleanup-proposal")
                    // The contract names this `roots`, and it is an array of
                    // `{rootId, rootName, proposal}` — not the whole daemon envelope
                    // under a `proposal` key, which is what used to be sent and what
                    // the shared UI's inbound validator silently discarded.
                    put("roots", response.jsonObject["roots"] ?: buildJsonArray {})
                },
            )
        }
    }

    private fun requestCleanupPlan(message: JsonObject) {
        val paths =
            message["assetPaths"]?.let { element ->
                runCatching { element.jsonArrayStrings() }.getOrDefault(emptyList())
            } ?: emptyList()

        scope.launch {
            val response =
                call(
                    Method.BUILD_CLEANUP_PLAN,
                    buildJsonObject { put("assetPaths", buildJsonArray { paths.forEach { add(it) } }) },
                    "Could not build a cleanup plan.",
                ) ?: return@launch

            val plans = response.jsonObject["plans"] as? JsonArray ?: buildJsonArray {}
            // Core's ids, recorded as issued. A client-invented id cannot reach an
            // executor, which is what makes "what you saw is what ran" structural.
            plans.forEach { entry ->
                entry.jsonObject["planId"]?.jsonPrimitive?.contentOrNull?.let { issuedCleanupPlans.add(it) }
            }
            post(
                buildJsonObject {
                    put("type", "cleanup-plan")
                    put("plans", plans)
                },
            )
        }
    }

    private fun applyCleanupPlan(message: JsonObject) {
        val planId = message.stringField("planId")
        if (planId !in issuedCleanupPlans) {
            postError("That cleanup preview is no longer available. Preview the removal again.")
            return
        }
        val allowPartial = message.booleanField("allowPartial")

        confirm(
            title = "Move assets to Animoria trash?",
            detail = "They can be restored with the \"Restore from Trash\" action.",
            onCancelled = {
                // Settled, not silent. The UI disables its controls the moment it
                // sends an apply and only a reply re-enables them; returning without
                // a word left the panel frozen on every dismissed dialog.
                post(refusedCleanupResult(null))
            },
        ) {
            scope.launch {
                val response =
                    call(
                        Method.APPLY_CLEANUP_PLAN,
                        buildJsonObject {
                            put("planId", planId)
                            put("allowPartial", allowPartial)
                        },
                        "The cleanup could not be applied.",
                    ) ?: run {
                        post(refusedCleanupResult("The cleanup could not be applied."))
                        return@launch
                    }

                issuedCleanupPlans.remove(planId)
                post(
                    buildJsonObject {
                        put("type", "cleanup-result")
                        put("result", response)
                    },
                )
                publishAnalysis()
            }
        }
    }

    private fun requestResolutionPlan(message: JsonObject) {
        val groupId = message.stringField("groupId")
        val keepPath = message.stringField("keepPath")

        scope.launch {
            val response =
                call(
                    Method.BUILD_RESOLUTION_PLAN,
                    buildJsonObject {
                        put("groupId", groupId)
                        put("keepPath", keepPath)
                    },
                    "Could not build a resolution plan.",
                ) ?: return@launch

            // Core's plan id, not a fabricated `groupId::keepPath`. The invented id
            // was never known to the daemon, so applying a resolution always failed
            // with `stale-plan` — the plan existed, and nothing could reach it.
            val planId = response.jsonObject["planId"]?.jsonPrimitive?.contentOrNull
            if (planId == null) {
                postError("The Animoria engine returned a resolution plan with no id.")
                return@launch
            }
            issuedResolutionPlans.add(planId)

            post(
                buildJsonObject {
                    put("type", "resolution-plan")
                    put("planId", planId)
                    // `rootId` and `rootName` are required by the contract; omitting
                    // them made every one of these messages fail validation.
                    put("rootId", response.jsonObject["rootId"] ?: json.parseToJsonElement("\"\""))
                    put("rootName", response.jsonObject["rootName"] ?: json.parseToJsonElement("\"\""))
                    put("plan", response.jsonObject["plan"] ?: buildJsonObject {})
                },
            )
        }
    }

    private fun applyResolutionPlan(message: JsonObject) {
        val planId = message.stringField("planId")
        if (planId !in issuedResolutionPlans) {
            postError("That resolution preview is no longer available. Select a copy again.")
            return
        }
        val allowPartial = message.booleanField("allowPartial")

        confirm(
            title = "Resolve duplicates?",
            detail =
                if (allowPartial) {
                    "Some references cannot be repointed automatically and will need fixing by hand."
                } else {
                    "Every reference will be repointed at the copy you kept."
                },
            onCancelled = { post(refusedResolutionResult(null)) },
        ) {
            scope.launch {
                val response =
                    call(
                        Method.APPLY_RESOLUTION_PLAN,
                        buildJsonObject {
                            put("planId", planId)
                            put("allowPartial", allowPartial)
                        },
                        "The resolution could not be applied.",
                    ) ?: run {
                        post(refusedResolutionResult("The resolution could not be applied."))
                        return@launch
                    }

                issuedResolutionPlans.remove(planId)
                post(
                    buildJsonObject {
                        put("type", "resolution-result")
                        put("status", response.jsonObject["status"]?.jsonPrimitive?.contentOrNull ?: "failed")
                        put("removedAssetPaths", response.jsonObject["removedAssetPaths"] ?: buildJsonArray {})
                        put("updatedReferenceCount", response.jsonObject["updatedReferenceCount"] ?: json.parseToJsonElement("0"))
                        put("recoveredBytes", response.jsonObject["recoveredBytes"] ?: json.parseToJsonElement("0"))
                        put("trashSessionId", response.jsonObject["trashSessionId"] ?: json.parseToJsonElement("null"))
                        put("reason", response.jsonObject["error"] ?: json.parseToJsonElement("null"))
                    },
                )
                publishAnalysis()
            }
        }
    }

    private fun requestTrashSessions() {
        scope.launch {
            val response = call(Method.LIST_TRASH_SESSIONS, failureMessage = "Could not list the trash.") ?: return@launch

            // The daemon answers per root; the contract wants one flat list. Flattened
            // here, with the root remembered so a restore can be routed back to it.
            val flattened =
                buildJsonArray {
                    (response.jsonObject["roots"] as? JsonArray)?.forEach { rootEntry ->
                        val rootId = rootEntry.jsonObject["rootId"]?.jsonPrimitive?.contentOrNull ?: return@forEach
                        (rootEntry.jsonObject["sessions"] as? JsonArray)?.forEach { session ->
                            session.jsonObject["sessionId"]?.jsonPrimitive?.contentOrNull?.let {
                                rootIdByTrashSession[it] = rootId
                            }
                            add(session)
                        }
                    }
                }

            post(
                buildJsonObject {
                    put("type", "trash-sessions")
                    put("sessions", flattened)
                },
            )
        }
    }

    private fun restoreSession(sessionId: String) {
        val rootId = rootIdByTrashSession[sessionId]
        if (rootId == null) {
            postError("Animoria does not know which root that trash session belongs to. List the trash again.")
            return
        }

        scope.launch {
            val response =
                call(
                    Method.RESTORE_TRASH_SESSION,
                    buildJsonObject {
                        put("sessionId", sessionId)
                        put("rootId", rootId)
                    },
                    "The restore could not be completed.",
                ) ?: return@launch

            post(
                buildJsonObject {
                    put("type", "restore-result")
                    put("result", response)
                },
            )
            publishAnalysis()
        }
    }

    /**
     * Sends every generated snippet to the panel.
     *
     * Shown rather than announced: the previous behaviour ended in a popup and a
     * clipboard write, so a developer had to paste into a file to discover which
     * framework they had picked or what the import line was. The native chooser
     * remains available from the tree; this is the reading surface.
     */
    private fun generateSnippet(assetPath: String) {
        scope.launch {
            val response =
                call(
                    Method.GENERATE_SNIPPET,
                    buildJsonObject { put("assetPath", assetPath) },
                    "Could not generate a snippet.",
                ) ?: return@launch

            val results = response.jsonObject["results"] as? JsonArray
            if (results == null || results.isEmpty()) {
                postError(
                    response.jsonObject["error"]?.jsonPrimitive?.contentOrNull
                        ?: "No snippet generator supports this asset.",
                )
                return@launch
            }

            post(
                buildJsonObject {
                    put("type", "snippets")
                    put("assetPath", assetPath)
                    put("snippets", results)
                },
            )
        }
    }

    /** A cleanup that did not happen, in the shape the contract requires. */
    private fun refusedCleanupResult(reason: String?): JsonObject =
        buildJsonObject {
            put("type", "cleanup-result")
            putJsonObject("result") {
                put("status", "rejected")
                put("removedAssetPaths", buildJsonArray {})
                put("bytesReclaimed", 0)
                put("trashSessionId", null as String?)
                put("trashLocation", null as String?)
                put("refusals", buildJsonArray {})
                put("reason", reason)
                put("completedAt", java.time.Instant.now().toString())
            }
        }

    private fun refusedResolutionResult(reason: String?): JsonObject =
        buildJsonObject {
            put("type", "resolution-result")
            put("status", "rejected")
            put("removedAssetPaths", buildJsonArray {})
            put("updatedReferenceCount", 0)
            put("recoveredBytes", 0)
            put("trashSessionId", null as String?)
            put("reason", reason)
        }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private fun manager(): CoreProcessManager = project.getService(CoreProcessManager::class.java)

    private fun postError(message: String) {
        post(
            buildJsonObject {
                put("type", "error")
                put("message", message)
                put("recoverable", true)
            },
        )
    }

    private fun JsonObject.stringField(name: String): String = this[name]?.jsonPrimitive?.contentOrNull ?: ""

    /**
     * A JSON boolean, read as a boolean.
     *
     * The previous reading compared `contentOrNull` against the string `"true"` and
     * then re-parsed the same field a second way in the same expression. It happened
     * to work for a literal `true`; it is not something the next reader should have
     * to verify.
     */
    private fun JsonObject.booleanField(name: String): Boolean =
        this[name]?.jsonPrimitive?.let { runCatching { it.boolean }.getOrDefault(false) } ?: false

    private fun JsonElement.jsonArrayStrings(): List<String> =
        (this as? kotlinx.serialization.json.JsonArray)?.mapNotNull { it.jsonPrimitive.contentOrNull }
            ?: emptyList()
}
