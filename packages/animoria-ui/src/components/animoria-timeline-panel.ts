import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AnalysisSnapshot, AuditEvent, AuditEventKind } from '@animoria/contracts';

interface TimelineItem {
  id: string;
  type: 'snapshot' | 'event';
  timestampMs: number;
  snapshot?: AnalysisSnapshot;
  event?: AuditEvent;
}

/**
 * Visualizes workspace historical snapshots and audit events over time.
 * Provides health score progression, governance activity markers, and snapshot rollback/selection.
 */
@customElement('animoria-timeline-panel')
export class AnimoriaTimelinePanel extends LitElement {
  @property({ attribute: false }) snapshots: readonly AnalysisSnapshot[] = [];
  @property({ attribute: false }) events: readonly AuditEvent[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) selectedSnapshotId = '';

  @state() private _filter: 'all' | 'snapshots' | 'remediation' = 'all';

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--animoria-bg-primary);
      color: var(--animoria-text);
      font-family: var(--animoria-font-family);
      font-size: var(--animoria-font-size-sm);
    }

    .header {
      padding: var(--animoria-space-3);
      border-bottom: 1px solid var(--animoria-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .title {
      font-weight: 600;
      font-size: var(--animoria-font-size-md);
      color: var(--animoria-text);
      margin: 0;
    }

    .badge-count {
      background: var(--animoria-bg-tertiary);
      color: var(--animoria-text-muted);
      padding: 2px 6px;
      border-radius: var(--animoria-radius-full);
      font-size: var(--animoria-font-size-xs);
    }

    .filters {
      display: flex;
      gap: var(--animoria-space-1);
      background: var(--animoria-bg-secondary);
      padding: 2px;
      border-radius: var(--animoria-radius-sm);
    }

    .filter-btn {
      background: transparent;
      border: none;
      color: var(--animoria-text-muted);
      padding: 4px 8px;
      border-radius: var(--animoria-radius-sm);
      cursor: pointer;
      font-size: var(--animoria-font-size-xs);
      transition: all 0.15s ease;
    }

    .filter-btn.active {
      background: var(--animoria-surface);
      color: var(--animoria-text);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: var(--animoria-space-4) var(--animoria-space-3);
      position: relative;
    }

    .timeline-track {
      position: relative;
      margin-left: 14px;
      border-left: 2px solid var(--animoria-border);
      padding-left: var(--animoria-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-4);
    }

    .timeline-entry {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--animoria-space-1);
      cursor: pointer;
      padding: var(--animoria-space-2) var(--animoria-space-3);
      border-radius: var(--animoria-radius-md);
      background: var(--animoria-bg-secondary);
      border: 1px solid var(--animoria-border);
      transition: all 0.15s ease;
    }

    .timeline-entry:hover {
      border-color: var(--animoria-accent);
      transform: translateX(2px);
    }

    .timeline-entry.selected {
      border-color: var(--animoria-accent);
      background: var(--animoria-accent-soft, rgba(99, 102, 241, 0.08));
    }

    .marker {
      position: absolute;
      left: calc(-1 * var(--animoria-space-4) - 7px);
      top: 10px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--animoria-bg-secondary);
      border: 2px solid var(--animoria-border);
      transition: all 0.2s ease;
    }

    .timeline-entry:hover .marker,
    .timeline-entry.selected .marker {
      border-color: var(--animoria-accent);
      background: var(--animoria-accent);
      box-shadow: 0 0 8px var(--animoria-accent);
    }

    .marker.event-trash {
      border-color: var(--animoria-danger);
    }

    .marker.event-restore {
      border-color: var(--animoria-success);
    }

    .marker.event-duplicate {
      border-color: var(--animoria-warning);
    }

    .entry-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--animoria-space-2);
    }

    .entry-title {
      font-weight: 500;
      color: var(--animoria-text);
      display: flex;
      align-items: center;
      gap: var(--animoria-space-2);
    }

    .score-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: var(--animoria-radius-sm);
    }

    .score-badge.grade-a {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .score-badge.grade-b,
    .score-badge.grade-c {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .score-badge.grade-d,
    .score-badge.grade-f {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .time-label {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      white-space: nowrap;
    }

    .entry-body {
      font-size: var(--animoria-font-size-xs);
      color: var(--animoria-text-muted);
      display: flex;
      flex-wrap: wrap;
      gap: var(--animoria-space-2);
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: var(--animoria-radius-sm);
      background: var(--animoria-bg-tertiary);
      font-size: 11px;
    }

    .tag.actor {
      color: var(--animoria-text);
      font-family: var(--animoria-font-mono, monospace);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 180px;
      color: var(--animoria-text-muted);
      text-align: center;
      gap: var(--animoria-space-2);
    }
  `;

  private _formatRelativeTime(timestampMs: number): string {
    const elapsed = Date.now() - timestampMs;
    const secs = Math.floor(elapsed / 1000);
    if (secs < 60) return `${Math.max(1, secs)}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private _getEventKindLabel(kind: AuditEventKind): string {
    switch (kind) {
      case 'scan-completed':
        return 'Scan Completed';
      case 'rule-violation-detected':
        return 'Rule Violation';
      case 'asset-staged-to-trash':
        return 'Asset Staged to Trash';
      case 'asset-restored-from-trash':
        return 'Asset Restored';
      case 'duplicate-resolved':
        return 'Duplicate Resolved';
      case 'policy-changed':
        return 'Policy Updated';
      default:
        return kind;
    }
  }

  private _getEventMarkerClass(kind: AuditEventKind): string {
    switch (kind) {
      case 'asset-staged-to-trash':
        return 'event-trash';
      case 'asset-restored-from-trash':
        return 'event-restore';
      case 'duplicate-resolved':
        return 'event-duplicate';
      default:
        return '';
    }
  }

  private _getItems(): TimelineItem[] {
    const items: TimelineItem[] = [];

    if (this._filter === 'all' || this._filter === 'snapshots') {
      for (const s of this.snapshots) {
        items.push({
          id: s.snapshot_id,
          type: 'snapshot',
          timestampMs: s.timestamp_ms,
          snapshot: s,
        });
      }
    }

    if (this._filter === 'all' || this._filter === 'remediation') {
      for (const e of this.events) {
        items.push({
          id: e.event_id,
          type: 'event',
          timestampMs: e.timestamp_ms,
          event: e,
        });
      }
    }

    items.sort((a, b) => b.timestampMs - a.timestampMs);
    return items;
  }

  private _selectSnapshot(snapshotId: string): void {
    this.selectedSnapshotId = snapshotId;
    this.dispatchEvent(
      new CustomEvent('snapshot-select', {
        detail: { snapshotId },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const items = this._getItems();

    return html`
      <div class="header">
        <div class="title-group">
          <h3 class="title">Timeline & Governance History</h3>
          <span class="badge-count">${items.length}</span>
        </div>
        <div class="filters">
          <button
            class="filter-btn ${this._filter === 'all' ? 'active' : ''}"
            @click=${() => {
              this._filter = 'all';
            }}
          >
            All
          </button>
          <button
            class="filter-btn ${this._filter === 'snapshots' ? 'active' : ''}"
            @click=${() => {
              this._filter = 'snapshots';
            }}
          >
            Snapshots
          </button>
          <button
            class="filter-btn ${this._filter === 'remediation' ? 'active' : ''}"
            @click=${() => {
              this._filter = 'remediation';
            }}
          >
            Remediation
          </button>
        </div>
      </div>

      <div class="content">
        ${this.loading ? html`<div class="empty-state">Loading timeline history…</div>` : nothing}
        ${
          !this.loading && items.length === 0
            ? html`<div class="empty-state">No timeline events or snapshots recorded yet.</div>`
            : nothing
        }
        ${
          items.length > 0
            ? html`
                <div class="timeline-track">
                  ${items.map((item) => {
                    if (item.type === 'snapshot' && item.snapshot) {
                      const snap = item.snapshot;
                      const score = snap.analysis?.health_score;
                      const grade = score?.grade ? score.grade.toLowerCase() : 'f';
                      const isSelected = this.selectedSnapshotId === snap.snapshot_id;

                      return html`
                        <div
                          class="timeline-entry ${isSelected ? 'selected' : ''}"
                          @click=${() => this._selectSnapshot(snap.snapshot_id)}
                        >
                          <div class="marker"></div>
                          <div class="entry-header">
                            <span class="entry-title">
                              Analysis Snapshot
                              ${
                                score
                                  ? html`
                                    <span class="score-badge grade-${grade}">
                                      Score: ${score.score}% (${score.grade})
                                    </span>
                                  `
                                  : nothing
                              }
                            </span>
                            <span class="time-label">${this._formatRelativeTime(snap.timestamp_ms)}</span>
                          </div>
                          <div class="entry-body">
                            <span class="tag">${snap.analysis?.assets?.length ?? 0} assets</span>
                            <span class="tag">${snap.analysis?.diagnostics?.length ?? 0} diagnostics</span>
                            <span class="tag">state: ${snap.analysis?.state ?? 'unknown'}</span>
                          </div>
                        </div>
                      `;
                    }

                    if (item.type === 'event' && item.event) {
                      const ev = item.event;
                      const markerClass = this._getEventMarkerClass(ev.kind);

                      return html`
                        <div class="timeline-entry">
                          <div class="marker ${markerClass}"></div>
                          <div class="entry-header">
                            <span class="entry-title">
                              ${this._getEventKindLabel(ev.kind)}
                            </span>
                            <span class="time-label">${this._formatRelativeTime(ev.timestamp_ms)}</span>
                          </div>
                          <div class="entry-body">
                            <span class="tag actor">actor: ${ev.actor}</span>
                            ${Object.entries(ev.details || {}).map(
                              ([key, val]) => html`<span class="tag">${key}: ${String(val)}</span>`
                            )}
                          </div>
                        </div>
                      `;
                    }

                    return nothing;
                  })}
                </div>
              `
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animoria-timeline-panel': AnimoriaTimelinePanel;
  }
}
