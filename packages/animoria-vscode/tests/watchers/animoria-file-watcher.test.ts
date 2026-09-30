import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimoriaFileWatcher } from '../../src/watchers/animoria-file-watcher.js';
import { Uri, workspace } from '../mocks/vscode.js';

describe('AnimoriaFileWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debounces rapid bursts of filesystem events into a single scan call', () => {
    let callCount = 0;
    const watcher = new AnimoriaFileWatcher(() => {
      callCount++;
    }, 400);

    const mockWatcher = workspace._lastFileSystemWatcher;
    expect(mockWatcher).toBeDefined();

    const dummyUri = Uri.file('/workspace/src/app.ts');

    // Simulate 5 rapid events in a row (e.g. typing or auto-save + format)
    mockWatcher?.simulate('change', dummyUri);
    mockWatcher?.simulate('change', dummyUri);
    mockWatcher?.simulate('create', dummyUri);
    mockWatcher?.simulate('change', dummyUri);
    mockWatcher?.simulate('delete', dummyUri);

    // No scan executed yet before debounce period
    expect(callCount).toBe(0);

    // Advance halfway through debounce window
    vi.advanceTimersByTime(200);
    expect(callCount).toBe(0);

    // Another event resets the timer
    mockWatcher?.simulate('change', dummyUri);
    vi.advanceTimersByTime(200);
    expect(callCount).toBe(0);

    // Finish the remaining debounce window
    vi.advanceTimersByTime(200);
    expect(callCount).toBe(1);

    watcher.dispose();
  });

  it('triggers immediately when debounceMs is 0', () => {
    let callCount = 0;
    const watcher = new AnimoriaFileWatcher(() => {
      callCount++;
    }, 0);

    const mockWatcher = workspace._lastFileSystemWatcher;
    const dummyUri = Uri.file('/workspace/src/index.ts');

    mockWatcher?.simulate('change', dummyUri);
    expect(callCount).toBe(1);

    mockWatcher?.simulate('create', dummyUri);
    expect(callCount).toBe(2);

    watcher.dispose();
  });

  it('cancels pending debounce scan when disposed', () => {
    let callCount = 0;
    const watcher = new AnimoriaFileWatcher(() => {
      callCount++;
    }, 400);

    const mockWatcher = workspace._lastFileSystemWatcher;
    const dummyUri = Uri.file('/workspace/src/app.ts');

    mockWatcher?.simulate('change', dummyUri);
    expect(callCount).toBe(0);

    // Dispose before timer fires
    watcher.dispose();

    vi.advanceTimersByTime(500);
    expect(callCount).toBe(0);
  });
});
