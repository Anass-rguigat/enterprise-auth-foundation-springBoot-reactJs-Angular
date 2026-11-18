import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card title="Reset password" subtitle="Choose a new password using the link from your email.">
      <form class="auth-form" (ngSubmit)="submit()">
        <ui-field label="Reset token" forId="reset-token" hint="Filled from the email link when present.">
          <ui-input inputId="reset-token" name="token" [(ngModel)]="token" />
        </ui-field>
        <ui-field label="New password" forId="reset-password" [error]="passwordError()">
          <ui-input
            inputId="reset-password"
            type="password"
            name="password"
            autocomplete="new-password"
            [(ngModel)]="password"
            [invalid]="!!passwordError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" [loading]="loading()">Update password</ui-button>
      </form>
      <p class="auth-form__links">
        <a routerLink="/login">Back to sign in</a>
      </p>
    </ui-auth-card>
  `,

})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  password = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly passwordError = signal('');

  async submit(): Promise<void> {
    this.passwordError.set(this.password.length >= 8 ? '' : 'Use at least 8 characters');
    this.formError.set(this.token.trim() ? '' : 'Reset token is required');
    if (this.passwordError() || this.formError()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.resetPassword(this.token.trim(), this.password);
      this.toasts.success('Password updated. Sign in with your new password.');
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not reset password'));
    } finally {
      this.loading.set(false);
    }
  }
}
