package com.sxnnyside.animoria.ui;

import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.wm.ToolWindowFactory;

/**
 * Base class for {@link AnimoriaToolWindowFactory}.
 *
 * Implements {@link ToolWindowFactory} and {@link DumbAware} in Java so that the Kotlin compiler does not generate
 * synthetic delegation bridge methods for default interface methods marked with
 * {@code @ApiStatus.Internal} in the IntelliJ Platform SDK (such as {@code getAnchor()},
 * {@code getIcon()}, and {@code manage()}), while guaranteeing the tool window is immediately available
 * during IDE background indexing.
 */
public abstract class AnimoriaToolWindowFactoryBase implements ToolWindowFactory, DumbAware {
}
