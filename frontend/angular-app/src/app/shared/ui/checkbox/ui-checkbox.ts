import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-checkbox',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckbox),
      multi: true,
    },
  ],
  template: `
    <label class="ui-check" [attr.for]="inputId || null">
      <input
        type="checkbox"
        class="ui-check__input"
        [attr.id]="inputId || null"
        [attr.name]="name || null"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />
      <span class="ui-check__label"><ng-content /></span>
    </label>
  `,
  styles: `
    .ui-check {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--space-2);
      font: 400 0.875rem/1.4 var(--font-sans);
      color: var(--color-text);
      cursor: pointer;
    }
    .ui-check__input {
      margin-top: 0.2rem;
      accent-color: var(--color-accent);
    }
    .ui-check__input:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  `,
})
export class UiCheckbox implements ControlValueAccessor {
  @Input() inputId = '';
  @Input() name = '';
  @Input() disabled = false;

  checked = false;
  private onChange: (v: boolean) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onToggle(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this.checked = next;
    this.onChange(next);
  }
}
