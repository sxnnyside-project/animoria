import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run() {
  console.log('🧪 Starting Animoria Real Electron Smoke Test Suite...');

  // 1. Verify commands are registered in the actual VS Code environment
  const commands = await vscode.commands.getCommands(true);
  const animoriaCommands = commands.filter((c) => c.startsWith('animoria.'));
  console.log(`⚡ Registered Animoria Commands in VS Code: ${animoriaCommands.length}`);

  assert.ok(animoriaCommands.includes('animoria.refresh'), 'animoria.refresh must be registered');
  assert.ok(
    animoriaCommands.includes('animoria.runGovernance'),
    'animoria.runGovernance must be registered',
  );
  assert.ok(
    animoriaCommands.includes('animoria.openWorkspace'),
    'animoria.openWorkspace must be registered',
  );
  assert.ok(
    animoriaCommands.includes('animoria.resolveDuplicates'),
    'animoria.resolveDuplicates must be registered',
  );

  console.log('✅ Real VS Code Electron Smoke Test passed successfully!');
}
