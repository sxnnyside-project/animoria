import type * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  operation: string;
  component: string;
  message: string;
  assetPath?: string;
  reason?: string;
  recovery?: string;
  error?: unknown;
}

export interface Logger {
  log(level: LogLevel, context: LogContext): void;
}

/**
 * Routes diagnostic entries to a VS Code `OutputChannel`.
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
