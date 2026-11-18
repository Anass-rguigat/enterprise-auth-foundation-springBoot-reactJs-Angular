import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-error-state',
  standalone: true,
  template: `
    <div class="ui-error" role="alert">
      <p class="ui-error__title">{{ title }}</p>
      @if (message) {
        <p class="ui-error__message">{{ message }}</p>
      }
      <div class="ui-error__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .ui-error {
      padding: var(--space-6) var(--space-4);
      border: 1px solid var(--color-danger);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .ui-error__title {
      margin: 0;
      font: 600 0.95rem/1.3 var(--font-sans);
      color: var(--color-danger);
    }
    .ui-error__message {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .ui-error__actions {
      margin-top: var(--space-4);
      display: flex;
      gap: var(--space-2);
    }
  `,
})
export class UiErrorState {
  @Input() title = 'Something went wrong';
  @Input() message = '';
}
