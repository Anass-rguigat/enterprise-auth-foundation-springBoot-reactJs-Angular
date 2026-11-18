import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  template: `
    <div class="ui-empty">
      <p class="ui-empty__title">{{ title }}</p>
      @if (message) {
        <p class="ui-empty__message">{{ message }}</p>
      }
      <div class="ui-empty__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .ui-empty {
      padding: var(--space-8) var(--space-4);
      text-align: center;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .ui-empty__title {
      margin: 0;
      font: 600 1rem/1.3 var(--font-sans);
    }
    .ui-empty__message {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .ui-empty__actions {
      margin-top: var(--space-4);
      display: flex;
      justify-content: center;
      gap: var(--space-2);
    }
  `,
})
export class UiEmptyState {
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
