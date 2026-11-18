import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInput),
      multi: true,
    },
  ],
  template: `
    <input
      class="ui-input"
      [attr.type]="type"
      [attr.id]="inputId || null"
      [attr.name]="name || null"
      [attr.placeholder]="placeholder || null"
      [attr.autocomplete]="autocomplete || null"
      [attr.aria-invalid]="invalid || null"
      [attr.aria-describedby]="describedBy || null"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  styles: `
    .ui-input {
      width: 100%;
      min-height: 2.25rem;
      padding: 0.4rem 0.65rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font: 400 0.875rem/1.4 var(--font-sans);
    }
    .ui-input:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
    .ui-input[aria-invalid='true'] {
      border-color: var(--color-danger);
    }
    .ui-input:disabled {
      opacity: 0.6;
      background: var(--color-surface-muted);
    }
  `,
})
export class UiInput implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() inputId = '';
  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete = '';
  @Input() invalid = false;
  @Input() describedBy = '';
  @Input() disabled = false;

  value = '';
  private onChange: (v: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value = next;
    this.onChange(next);
  }
}
