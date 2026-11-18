import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';
import { UiPageHeader } from '../../../shared/ui/page-header/ui-page-header';

@Component({
  selector: 'app-email-change-page',
  standalone: true,
  imports: [FormsModule, UiPageHeader, UiButton, UiField, UiInput],
  template: `
    <ui-page-header
      title="Change email"
      subtitle="Sends a verification message to the new address. Available to any signed-in user."
    />
    <form class="email-change-form" (ngSubmit)="submit()">
      <ui-field label="New email" forId="email-new" [error]="emailError()">
        <ui-input
          inputId="email-new"
          type="email"
          name="newEmail"
          autocomplete="email"
          [(ngModel)]="newEmail"
          [invalid]="!!emailError()"
        />
      </ui-field>
      @if (formError()) {
        <p class="auth-form__error" role="alert">{{ formError() }}</p>
      }
      <ui-button type="submit" [loading]="loading()">Request change</ui-button>
    </form>
  `,

})
export class EmailChangePage {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  newEmail = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly emailError = signal('');

  async submit(): Promise<void> {
    this.emailError.set(this.newEmail.trim().includes('@') ? '' : 'Enter a valid email');
    this.formError.set('');
    if (this.emailError()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.beginEmailChange(this.newEmail.trim());
      this.toasts.success('Check the new inbox to verify the address.');
      this.newEmail = '';
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not start email change'));
    } finally {
      this.loading.set(false);
    }
  }
}
