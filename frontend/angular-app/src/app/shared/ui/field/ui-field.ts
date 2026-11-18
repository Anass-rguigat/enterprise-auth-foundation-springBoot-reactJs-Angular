import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-field',
  standalone: true,
  template: `
    <div class="ui-field">
      @if (label) {
        <label class="ui-field__label" [attr.for]="forId || null">{{ label }}</label>
      }
      <ng-content />
      @if (hint && !error) {
        <p class="ui-field__hint">{{ hint }}</p>
      }
      @if (error) {
        <p class="ui-field__error" role="alert" [attr.id]="errorId || null">{{ error }}</p>
      }
    </div>
  `,
  styles: `
    .ui-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .ui-field__label {
      font: 500 0.8125rem/1.3 var(--font-sans);
      color: var(--color-text);
    }
    .ui-field__hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .ui-field__error {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-danger);
    }
  `,
})
export class UiField {
  @Input() label = '';
  @Input() forId = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() errorId = '';
}
