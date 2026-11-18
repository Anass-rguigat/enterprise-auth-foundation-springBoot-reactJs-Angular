import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { UiButton } from '../button/ui-button';

@Component({
  selector: 'ui-dialog',
  standalone: true,
  imports: [UiButton],
  template: `
    @if (open) {
      <div class="ui-dialog-root" role="presentation">
        <div class="ui-dialog-backdrop" (click)="onBackdrop()"></div>
        <div
          class="ui-dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
        >
          <header class="ui-dialog__header">
            <h2 [id]="titleId" class="ui-dialog__title">{{ title }}</h2>
          </header>
          <div class="ui-dialog__body">
            <ng-content />
          </div>
          <footer class="ui-dialog__footer">
            <ui-button variant="secondary" type="button" (click)="cancel.emit()">
              {{ cancelLabel }}
            </ui-button>
            <ui-button
              [variant]="danger ? 'danger' : 'primary'"
              type="button"
              [loading]="confirmLoading"
              (click)="confirm.emit()"
            >
              {{ confirmLabel }}
            </ui-button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .ui-dialog-root {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      padding: var(--space-4);
    }
    .ui-dialog-backdrop {
      position: absolute;
      inset: 0;
      background: rgb(15 22 28 / 45%);
    }
    .ui-dialog {
      position: relative;
      z-index: 1;
      width: min(28rem, 100%);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      padding: var(--space-6);
    }
    .ui-dialog__title {
      margin: 0;
      font: 600 1.1rem/1.3 var(--font-display);
    }
    .ui-dialog__body {
      margin: var(--space-4) 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .ui-dialog__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
    }
  `,
})
export class UiDialog {
  @Input() open = false;
  @Input() title = 'Confirm';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;
  @Input() confirmLoading = false;
  @Input() closeOnBackdrop = true;
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  readonly titleId = `ui-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.cancel.emit();
    }
  }

  onBackdrop(): void {
    if (this.closeOnBackdrop) {
      this.cancel.emit();
    }
  }
}
