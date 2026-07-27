import type { LogContext, LogLevel, Logger } from '@animoria/core';
import type * as vscode from 'vscode';

/**
 * Routes `@animoria/core`'s diagnostic entries to a VS Code
 * `OutputChannel`, formatted so the channel reads as a sequence of
 * product operations rather than an unordered pile of exceptions — the
 * operation identifier leads every line, ahead of the originating
 * component, so filtering or scanning the channel by workflow (all
 * `thumbnail-generation` lines, all `usage-scan` lines) stays possible
 * without any tooling beyond the channel's own search box.
 *
 * This is the one place `@animoria/core`'s `Logger` contract meets a
 * concrete VS Code API — everything upstream of this class stays
 * IDE-agnostic.
 */
export class OutputChannelLogger implements Logger {
  constructor(private readonly _channel: vscode.OutputChannel) {}

  log(level: LogLevel, context: LogContext): void {
    this._channel.appendLine(formatLogLine(level, context));
  }
}

function formatLogLine(level: LogLevel, context: LogContext): string {
  const timestamp = new Date().toISOString();
  const head = `${timestamp} ${level.toUpperCase().padEnd(5)} [${context.operation}] ${context.component}: ${context.message}`;

  const details: string[] = [];
  if (context.assetPath) details.push(`path=${context.assetPath}`);
  if (context.reason) details.push(`reason=${context.reason}`);
  if (context.recovery) details.push(`recovery=${context.recovery}`);
  if (context.error !== undefined) details.push(`error=${formatError(context.error)}`);

  return details.length > 0 ? `${head} (${details.join(', ')})` : head;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
