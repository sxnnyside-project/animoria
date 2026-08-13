package com.sxnnyside.animoria.ui

import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.JBColor
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import com.sxnnyside.animoria.bridge.JetBrainsHostBridge
import kotlinx.serialization.json.JsonObject
import java.awt.BorderLayout
import java.awt.Color
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * The single JCEF surface, hosting `@animoria/ui`.
 *
 * ## What this replaces
 * Two panels holding 1,322 lines of HTML, CSS and JavaScript inside Kotlin string
 * templates — a gallery (279 lines) that was a degraded reimplementation of the
 * sandbox's, and a preview (1,043) that was a third implementation of VS Code's.
 * Neither was type-checked, neither was linted, and both emitted `--vscode-*` CSS
 * variables from `JBColor` values because the shared token layer was written in VS
 * Code's vocabulary.
 *
 * ## The state-transport fix (the reason this class exists at all)
 * `AnimoriaGalleryPanel` pushed state with:
 *
 * ```kotlin
 * val js = "if (window.animoriaUpdateData) window.animoriaUpdateData($payload);"
 * browser.cefBrowser.executeJavaScript(js, "", 0)
 * ```
 *
 * That is not a message channel. There is no envelope, no type, no validation, and
 * no way for the UI to reject a malformed update. It is also an **injection
 * surface**: `buildJsonObject` guarantees the JSON is well-formed, and guarantees
 * nothing about the JavaScript source line the JSON is being pasted into — an asset
 * path containing a quote or a backslash, legal on every filesystem Animoria
 * supports, terminates the string literal.
 *
 * State now travels as a `MessageEvent`, base64-encoded on the way in so no payload
 * byte is ever interpreted as JavaScript source. `SemanticBoundaryTest.noStateInjection`
 * fails the build if `executeJavaScript` is used to carry state again.
 *
 * ## D-09
 * When `JBCefApp.isSupported()` is false there is no second UI. There is one
 * actionable panel that says so — see [AnimoriaDegradedPanel]. The 1,700-line Swing
 * stack this replaces was the branch that hid every action from every user.
 */
class AnimoriaSharedUiPanel(
    private val project: Project,
    parentDisposable: Disposable,
    /**
     * Which single product surface this panel renders.
     *
     * One capability per tool-window content tab, which is JetBrains' own idiom for
     * exactly this. The alternative — the shared UI's internal tab bar — put a tab
     * strip inside a tab strip and made every capability compete for one panel's
     * width, which is the arrangement this split removes.
     */
    private val surface: String = "all",
) : Disposable {
    private val logger = Logger.getInstance(AnimoriaSharedUiPanel::class.java)

    private var browser: JBCefBrowser? = null
    private var jsQuery: JBCefJSQuery? = null
    private var bridge: JetBrainsHostBridge? = null

    /** The component to place in the tool window. Never null: degraded is still a UI. */
    val component: JComponent = JPanel(BorderLayout())

    init {
        Disposer.register(parentDisposable, this)
        build()
    }

    private fun build() {
        if (!JBCefApp.isSupported()) {
            component.add(AnimoriaDegradedPanel(project).component, BorderLayout.CENTER)
            return
        }

        val cefBrowser = JBCefBrowser()
        browser = cefBrowser
        Disposer.register(this, cefBrowser)

        val query = JBCefJSQuery.create(cefBrowser as JBCefBrowserBase)
        jsQuery = query
        Disposer.register(this, query)

        val hostBridge =
            JetBrainsHostBridge(
                project = project,
                post = { message -> postToUi(message) },
            )
        bridge = hostBridge
        Disposer.register(this, hostBridge)

        query.addHandler { raw ->
            // Every inbound message is handled off the UI thread by the bridge, and
            // failures are logged rather than thrown: an exception escaping a JCEF
            // handler takes the browser down with it.
            runCatching { hostBridge.handle(raw) }
                .onFailure { logger.warn("Animoria: failed to handle a UI message", it) }
            null
        }

        cefBrowser.loadHTML(documentHtml(query.inject("JSON.stringify(message)")))
        component.add(cefBrowser.component, BorderLayout.CENTER)
    }

    /**
     * Delivers one `HostInbound` to the UI.
     *
     * The payload is base64-encoded and decoded in the page, so it crosses as **data**
     * rather than as source. Interpolating JSON into a JavaScript string literal —
     * what this replaces — means every quote, backslash, newline and line separator in
     * a path or a diagnostic message is a potential syntax error or an injection.
     */
    private fun postToUi(message: JsonObject) {
        val browser = this.browser ?: return
        val encoded =
            Base64.getEncoder()
                .encodeToString(message.toString().toByteArray(StandardCharsets.UTF_8))

        // Only the encoded string is interpolated, and base64's alphabet cannot
        // contain a quote, a backslash or a newline — so this line's grammar does not
        // depend on the payload's contents.
        val script = "window.__animoriaDeliver('$encoded');"
        browser.cefBrowser.executeJavaScript(script, browser.cefBrowser.url, 0)
    }

    /** Pushes the analysis the daemon most recently reported. */
    fun publishAnalysis() {
        bridge?.publishAnalysis()
        // Anything an action asked for while the UI was still mounting is delivered
        // now: `focus` posted into a page that has not subscribed is delivered to
        // nobody, and the first click on any contextual action is exactly that case.
        pendingFocus?.let { focus ->
            pendingFocus = null
            bridge?.publishFocus(focus.tab, focus.assetPath, focus.groupId, focus.rootId)
        }
    }

    /** Where an action wants the developer to land, and about what. */
    data class Focus(
        val tab: String,
        val assetPath: String? = null,
        val groupId: String? = null,
        val rootId: String = "",
    )

    private var pendingFocus: Focus? = null

    /** Routes the UI to [focus], or queues it until the UI can receive. */
    fun focus(focus: Focus) {
        pendingFocus = focus
        publishAnalysis()
    }

    companion object {
        /**
         * The mounted panel per project, so an action can route into it.
         *
         * A registry rather than a service, because the panel's lifetime is the tool
         * window's: it is registered when the content is created and cleared by the
         * same `Disposer` that tears the window down, so an action can never reach a
         * disposed panel.
         */
        private val mounted = mutableMapOf<String, MutableMap<String, AnimoriaSharedUiPanel>>()

        fun register(
            project: Project,
            panel: AnimoriaSharedUiPanel,
        ) {
            mounted.getOrPut(project.locationHash) { mutableMapOf() }[panel.surface] = panel
        }

        fun unregister(project: Project) {
            mounted.remove(project.locationHash)
        }

        /** The panel rendering [surface], or any panel when none is named. */
        fun of(
            project: Project,
            surface: String? = null,
        ): AnimoriaSharedUiPanel? {
            val panels = mounted[project.locationHash] ?: return null
            return if (surface == null) panels.values.firstOrNull() else panels[surface]
        }
    }

    override fun dispose() {
        browser = null
        jsQuery = null
        bridge = null
    }

    /**
     * The document skeleton: the bundle, the token adapter, and the transport.
     *
     * The bundle is inlined rather than served over a scheme handler. A JCEF scheme
     * handler is the tidier option and one more moving part that can be wrong in only
     * this IDE; the bundle is ~95 kB, which is nothing next to a JVM, and inlining it
     * means "the panel is blank" can only ever be a JavaScript error rather than a
     * resource-resolution failure with no visible cause.
     */
    private fun documentHtml(queryInject: String): String {
        val bundle = loadResource("/web/animoria-ui.global.js")
        val tokens = loadResource("/web/tokens.css")

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <style>$tokens</style>
            <style>${themeAdapterCss()}</style>
            <style>
              html, body { height: 100%; margin: 0; padding: 0; }
              #root { height: 100%; display: flex; flex-direction: column; }
            </style>
            </head>
            <body>
            <div id="root"></div>
            <script>
            $bundle
            </script>
            <script>
            // ── Transport ────────────────────────────────────────────────────
            // Host → UI arrives as a `MessageEvent`, exactly as it does in a VS Code
            // webview, so the shared bridge needs no JetBrains-specific branch.
            window.__animoriaDeliver = function (encoded) {
              const text = new TextDecoder().decode(
                Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
              );
              window.postMessage(JSON.parse(text), '*');
            };

            const { mount, createPostMessageBridge } = window.__animoriaUi;
            mount(
              document.getElementById('root'),
              createPostMessageBridge({
                post: function (message) { $queryInject }
              }),
              "$surface"
            );
            </script>
            </body>
            </html>
            """.trimIndent()
    }

    /**
     * IntelliJ theme → Animoria tokens.
     *
     * The one adapter, in the host whose vocabulary these names are. Both previous
     * panels had their own copy of this mapping and the two had already drifted — one
     * read `JBColor.lazy { UIUtil.getEditorPaneBackground() }`, the other
     * `EditorColorsManager.globalScheme.defaultBackground` — and *both* emitted
     * `--vscode-*` names from a JetBrains IDE.
     *
     * ## Why every token, and not only the ones that were easy
     * This used to define twelve. The shared UI reads about twenty-five, so the rest
     * fell through to the defaults in `tokens.css` — and those defaults are VS Code
     * dark-theme values. A JetBrains developer therefore got IntelliJ's panel colours
     * for the surfaces this file happened to cover and VS Code's for hover, selection,
     * severity, typography and scrollbars. That is precisely the "a VS Code webview
     * wearing JetBrains colours" the review named.
     *
     * Severity colours come from `JBUI.CurrentTheme` and `NamedColorUtil` rather than
     * from constants, so a user's theme — Darcula, Light, High Contrast, or a custom
     * one — drives them the way it drives the rest of the IDE.
     */
    private fun themeAdapterCss(): String {
        val panelBg = UIUtil.getPanelBackground()
        val labelFg = UIUtil.getLabelForeground()
        val inputBg = UIUtil.getTextFieldBackground()
        val border = JBColor.border()
        val focus = JBUI.CurrentTheme.Focus.focusColor()
        val contextFg = UIUtil.getContextHelpForeground()
        val listHover = UIUtil.getListSelectionBackground(false)
        val listSelected = UIUtil.getListSelectionBackground(true)
        val listSelectedFg = UIUtil.getListSelectionForeground(true)

        // The platform's label font is the IDE's own size. Deriving the scale from it
        // is what stops the panel's secondary text from sitting below everything
        // around it — the single largest reason the shared UI read as non-native.
        val labelFont = UIUtil.getLabelFont()

        return """
            :root {
              --animoria-font-family: "${labelFont.family}", system-ui, sans-serif;
              --animoria-font-mono: "${EditorColorsManager.getInstance().globalScheme.editorFontName}", ui-monospace, monospace;
              --animoria-font-size-base: ${labelFont.size}px;

              --animoria-bg-primary: ${hex(panelBg)};
              --animoria-bg-secondary: ${hex(inputBg)};
              --animoria-bg-raised: ${hex(JBColor.namedColor("Panel.background", panelBg))};
              --animoria-bg-hover: ${hex(listHover)};
              --animoria-bg-selected: ${hex(listSelected)};

              --animoria-text-primary: ${hex(labelFg)};
              --animoria-text-strong: ${hex(labelFg)};
              --animoria-text-muted: ${hex(contextFg)};
              --animoria-text-on-accent: ${hex(listSelectedFg)};

              --animoria-border: ${hex(border)};
              --animoria-border-strong: ${hex(border)};
              --animoria-focus-ring: ${hex(focus)};
              --animoria-accent: ${hex(focus)};
              --animoria-accent-hover: ${hex(focus.brighter())};

              --animoria-success: ${hex(JBColor.namedColor("Label.successForeground", JBColor.GREEN))};
              --animoria-warning: ${hex(JBColor.namedColor("Component.warningFocusColor", JBColor.ORANGE))};
              --animoria-danger: ${hex(JBColor.namedColor("Label.errorForeground", JBColor.RED))};
              --animoria-danger-quiet: ${rgba(JBColor.namedColor("Label.errorForeground", JBColor.RED), 0.14)};
              --animoria-info: ${hex(focus)};

              --animoria-state-stale: ${hex(JBColor.namedColor("Component.warningFocusColor", JBColor.ORANGE))};
              --animoria-state-incomplete: ${hex(contextFg)};

              --animoria-scroll-thumb: ${hex(border)};
              --animoria-scroll-thumb-hover: ${hex(contextFg)};
            }
            """.trimIndent()
    }

    /** A theme colour at partial opacity, for the quiet severity surfaces. */
    private fun rgba(
        color: Color,
        alpha: Double,
    ): String = "rgba(${color.red}, ${color.green}, ${color.blue}, $alpha)"

    private fun hex(color: Color): String = String.format(java.util.Locale.ROOT, "#%02x%02x%02x", color.red, color.green, color.blue)

    private fun loadResource(path: String): String =
        javaClass.getResourceAsStream(path)?.use { it.readBytes().toString(StandardCharsets.UTF_8) }
            ?: run {
                // A missing bundle is a broken build, not a degraded runtime. Saying so
                // in the panel beats a blank rectangle with nothing in the log.
                logger.error("Animoria: $path is missing from the plugin jar. The build did not copy the shared UI.")
                ""
            }
}
