import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UiAuthCard } from '../../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../../shared/ui/button/ui-button';
import { UiField } from '../../../shared/ui/field/ui-field';
import { UiInput } from '../../../shared/ui/input/ui-input';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card title="Verify email" subtitle="Confirm your email address with the token from the message.">
      <form class="auth-form" (ngSubmit)="submit()">
        <ui-field label="Verification token" forId="verify-token">
          <ui-input inputId="verify-token" name="token" [(ngModel)]="token" />
        </ui-field>
        @if (formError()) {
          <p class="auth-form__error" role="alert">{{ formError() }}</p>
        }
        @if (success()) {
          <p class="auth-form__ok" role="status">Email verified. You can sign in.</p>
        }
        <ui-button type="submit" [loading]="loading()">Verify</ui-button>
      </form>
      <p class="auth-form__links">
        <a routerLink="/login">Back to sign in</a>
      </p>
    </ui-auth-card>
  `,
})
export class VerifyEmailPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  token = '';
  readonly loading = signal(false);
  readonly formError = signal('');
  readonly success = signal(false);
  private autoTried = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (this.token && !this.autoTried) {
      this.autoTried = true;
      void this.submit();
    }
  }

  async submit(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.formError.set(this.token.trim() ? '' : 'Token is required');
    if (!this.token.trim()) {
      return;
    }
    this.loading.set(true);
    this.formError.set('');
    try {
      await this.auth.verifyEmail(this.token.trim());
      this.success.set(true);
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not verify email'));
    } finally {
      this.loading.set(false);
    }
  }
}
