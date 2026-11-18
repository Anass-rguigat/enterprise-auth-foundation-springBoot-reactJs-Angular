import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card
      [title]="forced() ? 'Password change required' : 'Change password'"
      [subtitle]="
        forced()
          ? 'You must set a new password before using the application. You will sign in again afterward.'
          : 'Updates your password, revokes all sessions, and requires a fresh sign-in.'
      "
    >
      <form class="auth-form" (ngSubmit)="submit()">
        <ui-field label="Current password" forId="chg-current" [error]="currentError()">
          <ui-input
            inputId="chg-current"
            type="password"
            name="currentPassword"
            autocomplete="current-password"
            [(ngModel)]="currentPassword"
            [invalid]="!!currentError()"
          />
        </ui-field>
        <ui-field label="New password" forId="chg-new" [error]="newError()">
          <ui-input
            inputId="chg-new"
            type="password"
            name="newPassword"
            autocomplete="new-password"
            [(ngModel)]="newPassword"
            [invalid]="!!newError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" [loading]="loading()">Update password</ui-button>
      </form>
      @if (!forced()) {
        <p class="auth-form__links">
          <a routerLink="/dashboard">Cancel</a>
        </p>
      }
    </ui-auth-card>
  `,

})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  currentPassword = '';
  newPassword = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly currentError = signal('');
  readonly newError = signal('');
  readonly forced = signal(this.auth.status() === 'mustChangePassword');

  async submit(): Promise<void> {
    this.currentError.set(this.currentPassword ? '' : 'Current password is required');
    this.newError.set(this.newPassword.length >= 8 ? '' : 'Use at least 8 characters');
    this.formError.set('');
    if (this.currentError() || this.newError()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.toasts.success('Password updated. Sign in again.');
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not change password'));
    } finally {
      this.loading.set(false);
    }
  }
}
