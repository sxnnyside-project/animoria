import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { AnimoriaTreeItem } from '../../src/providers/animoria-tree-provider.js';
import { buildAsset } from '../support/fakes.js';

describe('AnimoriaTreeItem rendering', () => {
  it('renders a valid tree item without thumbnail', () => {
    const item = new AnimoriaTreeItem(buildAsset(), undefined, []);

    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect(item.label).toBe('hero');
  });

  it('shows the generated thumbnail file once one exists', () => {
    const item = new AnimoriaTreeItem(buildAsset(), '/workspace/.animoria/thumbnails/hero.png', []);

    expect(item.iconPath).toBeInstanceOf(vscode.Uri);
  });
});
