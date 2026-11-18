import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card
      title="Forgot password"
      subtitle="If an account exists for that email, a reset link will be sent."
    >
      <form class="auth-form" (ngSubmit)="submit()">
        <ui-field label="Email" forId="forgot-email" [error]="emailError()">
          <ui-input
            inputId="forgot-email"
            type="email"
            name="email"
            autocomplete="username"
            [(ngModel)]="email"
            [invalid]="!!emailError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" [loading]="loading()">Send reset link</ui-button>
      </form>
      <p class="auth-form__links">
        <a routerLink="/login">Back to sign in</a>
      </p>
    </ui-auth-card>
  `,

})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  email = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly emailError = signal('');

  async submit(): Promise<void> {
    this.emailError.set(this.email.trim() ? '' : 'Email is required');
    this.formError.set('');
    if (this.emailError()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.forgotPassword(this.email.trim());
      this.toasts.success('If that email is registered, a reset link is on its way.');
      this.email = '';
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not start password reset'));
    } finally {
      this.loading.set(false);
    }
  }
}
