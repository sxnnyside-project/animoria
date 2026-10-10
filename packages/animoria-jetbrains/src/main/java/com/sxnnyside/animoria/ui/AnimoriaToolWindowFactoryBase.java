package com.sxnnyside.animoria.ui;

import com.intellij.openapi.wm.ToolWindowFactory;

/**
 * Base class for {@link AnimoriaToolWindowFactory}.
 *
 * Implements {@link ToolWindowFactory} in Java so that the Kotlin compiler does not generate
 * synthetic delegation bridge methods for default interface methods marked with
 * {@code @ApiStatus.Internal} in the IntelliJ Platform SDK (such as {@code getAnchor()},
 * {@code getIcon()}, and {@code manage()}).
 */
public abstract class AnimoriaToolWindowFactoryBase implements ToolWindowFactory {
}
