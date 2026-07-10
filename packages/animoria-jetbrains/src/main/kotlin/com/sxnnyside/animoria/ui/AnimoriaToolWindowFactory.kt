package com.sxnnyside.animoria.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.JBColor
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.util.Disposer
import com.sxnnyside.animoria.backend.CoreProcessManager
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class ScanProgressJsPayload(
    val command: String = "scanProgress",
    val index: Int,
    val total: Int,
    val message: String
)

/**
 * Factory class registered in plugin.xml responsible for creating the
 * Animoria Tool Window in the JetBrains IDE.
 * Integrates the JCEF JBCefBrowser component and coordinates message communication
 * with the background Node process daemon.
 */
class AnimoriaToolWindowFactory : ToolWindowFactory {
    /**
     * Initializes the tool window content.
     * Hooks up daemon listeners to WebView javascript callbacks, sets look-and-feel classes,
     * registers theme changes, launches the Node daemon, and mounts the panel UI.
     *
     * @param project The active project instance.
     * @param toolWindow The tool window instance created by the IntelliJ Platform.
     */
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val browser = JBCefBrowser()
        val processManager = project.getService(CoreProcessManager::class.java)

        // 1. Register daemon process callbacks to JCEF JS Bridge
        processManager.onScanProgress = { percent, message ->
            val payload = ScanProgressJsPayload(index = percent, total = 100, message = message)
            val json = Json.encodeToString(ScanProgressJsPayload.serializer(), payload)
            browser.cefBrowser.executeJavaScript(
                "window.postMessage($json, '*');",
                browser.cefBrowser.url, 0
            )
        }

        processManager.onScanComplete = { assetsJson ->
            browser.cefBrowser.executeJavaScript(
                "window.postMessage({ command: 'scanComplete', assets: $assetsJson }, '*');",
                browser.cefBrowser.url, 0
            )
        }

        processManager.onWatcherEvent = { eventJson ->
            browser.cefBrowser.executeJavaScript(
                "const evt = $eventJson; window.postMessage({ command: 'watcherEvent', type: evt.type, asset: evt.asset }, '*');",
                browser.cefBrowser.url, 0
            )
        }

        // 2. Add JCEF Load Handler to apply Intellij theme class on end loading
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                if (frame?.isMain == true) {
                    val bodyClass = if (JBColor.isBright()) "theme-intellij-light" else "theme-intellij-dark"
                    browser?.executeJavaScript(
                        "document.body.className = '$bodyClass';",
                        browser.url, 0
                    )
                }
            }
        }, browser.cefBrowser)

        // 3. Listen to real-time editor Look and Feel theme changes
        val busConnection = project.messageBus.connect(toolWindow.disposable)
        busConnection.subscribe(LafManagerListener.TOPIC, LafManagerListener {
            val bodyClass = if (JBColor.isBright()) "theme-intellij-light" else "theme-intellij-dark"
            browser.cefBrowser.executeJavaScript(
                "document.body.className = '$bodyClass';",
                browser.cefBrowser.url, 0
            )
        })

        // 4. Start the background Node core scanner process
        processManager.start()

        // 5. Load local Lit components resources index
        val htmlResource = AnimoriaToolWindowFactory::class.java.getResource("/assets/index.html")
        if (htmlResource != null) {
            browser.loadURL(htmlResource.toExternalForm())
        } else {
            browser.loadHTML("<html><body style='background:#0d0d0f;color:#e2e8f0;padding:20px;font-family:sans-serif;'>" +
                             "<h3>Animoria JCEF: Assets bundles not found.</h3>" +
                             "<p>Please run <code>pnpm package:jetbrains</code> to compile Lit templates.</p></body></html>")
        }

        // 6. Bind component view content
        val content = ContentFactory.getInstance().createContent(browser.component, "", false)
        toolWindow.contentManager.addContent(content)

        // 7. Cleanup process lifecycle safely on tool window disposable
        Disposer.register(toolWindow.disposable) {
            processManager.stop()
        }
    }
}
