import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-mfa-challenge-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card
      title="Multi-factor authentication"
      subtitle="Enter your authenticator code or a recovery code."
    >
      <form class="auth-form" (ngSubmit)="submitTotp()">
        <ui-field label="Authenticator code" forId="mfa-code" [error]="codeError()">
          <ui-input
            inputId="mfa-code"
            name="code"
            autocomplete="one-time-code"
            [(ngModel)]="code"
            [invalid]="!!codeError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" [loading]="loading()">Verify</ui-button>
        <ui-button type="button" variant="secondary" [loading]="loading()" (click)="submitRecovery()">
          Use recovery code
        </ui-button>
      </form>
      <p class="auth-form__links">
        <a routerLink="/login">Back to sign in</a>
      </p>
    </ui-auth-card>
  `,

})
export class MfaChallengePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  code = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly codeError = signal('');

  async submitTotp(): Promise<void> {
    await this.run(() => this.auth.verifyMfa(this.code.trim()));
  }

  async submitRecovery(): Promise<void> {
    await this.run(() => this.auth.recoverMfa(this.code.trim()));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.codeError.set(this.code.trim() ? '' : 'Code is required');
    this.formError.set('');
    if (this.codeError()) {
      return;
    }
    this.loading.set(true);
    try {
      await action();
      if (this.auth.status() === 'mustChangePassword') {
        await this.router.navigateByUrl('/change-password');
        return;
      }
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Invalid verification code'));
    } finally {
      this.loading.set(false);
    }
  }
}
