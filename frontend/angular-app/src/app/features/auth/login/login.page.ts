import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card title="Sign in" subtitle="Cookie session against the Spring Boot API. JWTs stay HttpOnly.">
      <form class="auth-form" (ngSubmit)="submit()">
        <ui-field label="Email" forId="login-email" [error]="emailError()">
          <ui-input
            inputId="login-email"
            type="email"
            name="email"
            autocomplete="username"
            [(ngModel)]="email"
            [invalid]="!!emailError()"
          />
        </ui-field>
        <ui-field label="Password" forId="login-password" [error]="passwordError()">
          <ui-input
            inputId="login-password"
            type="password"
            name="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            [invalid]="!!passwordError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" variant="primary" [loading]="loading()">Sign in</ui-button>
      </form>
      <p class="auth-form__links">
        <a routerLink="/forgot-password">Forgot password?</a>
      </p>
    </ui-auth-card>
  `,

})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly emailError = signal('');
  readonly passwordError = signal('');

  async submit(): Promise<void> {
    this.emailError.set(this.email.trim() ? '' : 'Email is required');
    this.passwordError.set(this.password ? '' : 'Password is required');
    this.formError.set('');
    if (this.emailError() || this.passwordError()) {
      return;
    }

    this.loading.set(true);
    try {
      const outcome = await this.auth.login(this.email.trim(), this.password);
      if (outcome === 'mfaRequired') {
        await this.router.navigateByUrl('/mfa');
        return;
      }
      if (this.auth.status() === 'mustChangePassword') {
        await this.router.navigateByUrl('/change-password');
        return;
      }
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Invalid email or password'));
    } finally {
      this.loading.set(false);
    }
  }
}
