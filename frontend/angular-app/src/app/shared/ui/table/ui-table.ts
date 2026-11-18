import { Component } from '@angular/core';

/** Wraps a consumer-provided <table>; avoids projecting thead/tbody into a host <table>. */
@Component({
  selector: 'ui-table',
  standalone: true,
  template: `
    <div class="ui-table-wrap">
      <ng-content />
    </div>
  `,
  styles: `
    .ui-table-wrap {
      width: 100%;
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
    :host ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    :host ::ng-deep th,
    :host ::ng-deep td {
      padding: 0.65rem 0.85rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }
    :host ::ng-deep th {
      font-weight: 600;
      color: var(--color-text-muted);
      background: var(--color-surface-muted);
      white-space: nowrap;
    }
    :host ::ng-deep tbody tr:last-child td {
      border-bottom: none;
    }
  `,
})
export class UiTable {}
