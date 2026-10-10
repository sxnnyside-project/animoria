package com.sxnnyside.animoria.ui;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.wm.CustomStatusBarWidget;

/**
 * Base class for {@link AnimoriaStatusBarWidget}.
 *
 * Implements {@link CustomStatusBarWidget} and {@link Disposable} in Java so that
 * the Kotlin compiler does not generate synthetic bridge methods for deprecated
 * methods in {@link com.intellij.openapi.wm.StatusBarWidget}.
 */
public abstract class AnimoriaStatusBarWidgetBase implements CustomStatusBarWidget, Disposable {
}
