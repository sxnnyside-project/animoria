import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

export function resolveChromiumPath(): string | null {
  const inspect = vscode.workspace.getConfiguration('animoria').inspect<string>('chromiumPath');
  if (inspect) {
    if (inspect.workspaceValue || inspect.workspaceFolderValue) {
      vscode.window.showWarningMessage(
        'Workspace-level animoria.chromiumPath setting ignored for security. Falling back to global configuration.'
      );
      if (inspect.globalValue && existsSync(inspect.globalValue)) {
        return inspect.globalValue;
      }
    } else if (inspect.globalValue && existsSync(inspect.globalValue)) {
      return inspect.globalValue;
    }
  }

  // Strategy 2: Environment variable
  const envPath = process.env.CHROME_PATH ?? process.env.CHROMIUM_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  // Strategy 3: Common install locations by platform
  const platform = process.platform;
  const candidates: string[] = [];

  if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    );
  } else if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      (process.env.LOCALAPPDATA ?? '') + '\\Google\\Chrome\\Application\\chrome.exe'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    );
  }

  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }

  // Strategy 4: which/where command
  try {
    const cmd = platform === 'win32' ? 'where chrome' : 'which google-chrome || which chromium';
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')[0];
    if (result && existsSync(result)) return result;
  } catch {
    // not found in PATH
  }

  return null;
}
