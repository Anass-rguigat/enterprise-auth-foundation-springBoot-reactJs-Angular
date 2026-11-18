import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type UiSelectOption = { value: string; label: string };

@Component({
  selector: 'ui-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelect),
      multi: true,
    },
  ],
  template: `
    <select
      class="ui-select"
      [attr.id]="inputId || null"
      [attr.name]="name || null"
      [attr.aria-invalid]="invalid || null"
      [attr.aria-describedby]="describedBy || null"
      [disabled]="disabled"
      [value]="value"
      (change)="onSelect($event)"
      (blur)="onTouched()"
    >
      @if (placeholder) {
        <option value="" disabled [selected]="!value">{{ placeholder }}</option>
      }
      @for (opt of options; track opt.value) {
        <option [value]="opt.value" [selected]="opt.value === value">{{ opt.label }}</option>
      }
    </select>
  `,
  styles: `
    .ui-select {
      width: 100%;
      min-height: 2.25rem;
      padding: 0.4rem 0.65rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font: 400 0.875rem/1.4 var(--font-sans);
    }
    .ui-select:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
    .ui-select[aria-invalid='true'] {
      border-color: var(--color-danger);
    }
  `,
})
export class UiSelect implements ControlValueAccessor {
  @Input() options: readonly UiSelectOption[] = [];
  @Input() inputId = '';
  @Input() name = '';
  @Input() placeholder = '';
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

  onSelect(event: Event): void {
    const next = (event.target as HTMLSelectElement).value;
    this.value = next;
    this.onChange(next);
  }
}
