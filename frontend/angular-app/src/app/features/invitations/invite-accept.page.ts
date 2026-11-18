import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { InvitationsApi } from './invitations.api';
import { UiAuthCard } from '../../shared/ui/auth-card/ui-auth-card';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';

@Component({
  selector: 'app-invite-accept-page',
  standalone: true,
  imports: [FormsModule, RouterLink, UiAuthCard, UiButton, UiField, UiInput],
  template: `
    <ui-auth-card title="Accept invitation" subtitle="Set your password to activate the invited account.">
      <form class="form" (ngSubmit)="submit()">
        <ui-field label="Invitation token" forId="inv-token">
          <ui-input inputId="inv-token" name="token" [(ngModel)]="token" />
        </ui-field>
        <ui-field label="Password" forId="inv-password" [error]="passwordError()">
          <ui-input
            inputId="inv-password"
            type="password"
            name="password"
            autocomplete="new-password"
            [(ngModel)]="password"
            [invalid]="!!passwordError()"
          />
        </ui-field>
        @if (formError()) {
          <p class="err" role="alert">{{ formError() }}</p>
        }
        <ui-button type="submit" [loading]="loading()">Accept &amp; activate</ui-button>
      </form>
      <p class="links"><a routerLink="/login">Sign in</a></p>
    </ui-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .err {
      margin: 0;
      color: var(--color-danger);
      font-size: 0.875rem;
    }
    .links {
      margin: var(--space-4) 0 0;
      font-size: 0.875rem;
    }
    .links a {
      color: var(--color-accent);
    }
  `,
})
export class InviteAcceptPage {
  private readonly api = inject(InvitationsApi);
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
    this.formError.set(this.token.trim() ? '' : 'Invitation token is required');
    if (this.passwordError() || this.formError()) {
      return;
    }
    this.loading.set(true);
    try {
      await this.api.accept(this.token.trim(), this.password);
      this.toasts.success('Invitation accepted. Sign in with your new password.');
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Could not accept invitation'));
    } finally {
      this.loading.set(false);
    }
  }
}
