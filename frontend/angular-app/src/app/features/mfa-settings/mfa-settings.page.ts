import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { MfaEnrollmentStart, MfaStatus } from '../../core/api/page.types';
import { MfaApi } from './mfa.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';

@Component({
  selector: 'app-mfa-settings-page',
  standalone: true,
  imports: [
    FormsModule,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiLoadingState,
    UiErrorState,
  ],
  template: `
    <ui-page-header
      title="MFA settings"
      subtitle="Self-service MFA — any signed-in user (not gated by MFA_MANAGE)."
    />

    @if (loading()) {
      <ui-loading-state />
    } @else if (error()) {
      <ui-error-state title="Failed to load MFA status" [message]="error()!">
        <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
      </ui-error-state>
    } @else if (status(); as s) {
      <section class="fp-mfa">
        <p>
          Status:
          <strong>{{ s.enabled ? 'Enabled' : 'Disabled' }}</strong>
          @if (s.enrollmentPending) {
            · enrollment pending
          }
          @if (s.enabled) {
            · {{ s.unusedRecoveryCodes }} recovery codes left
          }
        </p>

        @if (!s.enabled && !enrollment()) {
          <ui-button type="button" [loading]="busy()" (click)="startEnroll()">Start enrollment</ui-button>
        }

        @if (enrollment(); as e) {
          <div class="fp-dialog-form">
            <p class="fp-muted">Add this secret to your authenticator app, then confirm with a TOTP code.</p>
            <p><strong>Secret:</strong> <code>{{ e.secretBase32 }}</code></p>
            <p class="uri"><strong>otpauth:</strong> <code>{{ e.otpauthUri }}</code></p>
            <ui-field label="Confirmation code" forId="mfa-confirm">
              <ui-input inputId="mfa-confirm" name="confirm" [(ngModel)]="confirmCode" />
            </ui-field>
            <div class="fp-row">
              <ui-button type="button" [loading]="busy()" (click)="confirmEnroll()">Confirm</ui-button>
              <ui-button variant="secondary" type="button" [loading]="busy()" (click)="cancelEnroll()">
                Cancel
              </ui-button>
            </div>
          </div>
        }

        @if (recoveryCodes().length) {
          <div class="fp-dialog-form">
            <h2>Recovery codes (store securely — shown once)</h2>
            <ul>
              @for (c of recoveryCodes(); track c) {
                <li><code>{{ c }}</code></li>
              }
            </ul>
          </div>
        }

        @if (s.enabled) {
          <div class="fp-dialog-form">
            <h2>Regenerate recovery codes</h2>
            <ui-field label="Password" forId="regen-pw">
              <ui-input inputId="regen-pw" type="password" name="regenPw" [(ngModel)]="regenPassword" />
            </ui-field>
            <ui-field label="Current TOTP / recovery code" forId="regen-code">
              <ui-input inputId="regen-code" name="regenCode" [(ngModel)]="regenCode" />
            </ui-field>
            <ui-button type="button" [loading]="busy()" (click)="regenerate()">Regenerate</ui-button>

            <h2>Disable MFA</h2>
            <ui-field label="Password" forId="dis-pw">
              <ui-input inputId="dis-pw" type="password" name="disPw" [(ngModel)]="disablePassword" />
            </ui-field>
            <ui-field label="Current TOTP / recovery code" forId="dis-code">
              <ui-input inputId="dis-code" name="disCode" [(ngModel)]="disableCode" />
            </ui-field>
            <ui-button variant="danger" type="button" [loading]="busy()" (click)="disable()">Disable MFA</ui-button>
          </div>
        }
      </section>
    }
  `,

})
export class MfaSettingsPage implements OnInit {
  private readonly api = inject(MfaApi);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  readonly status = signal<MfaStatus | null>(null);
  readonly enrollment = signal<MfaEnrollmentStart | null>(null);
  readonly recoveryCodes = signal<string[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  confirmCode = '';
  regenPassword = '';
  regenCode = '';
  disablePassword = '';
  disableCode = '';

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const status = await this.api.status();
      this.status.set(status);
      if (!status.enrollmentPending) {
        this.enrollment.set(null);
      }
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load MFA status'));
    } finally {
      this.loading.set(false);
    }
  }

  async startEnroll(): Promise<void> {
    this.busy.set(true);
    try {
      this.enrollment.set(await this.api.enroll());
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Could not start enrollment'));
    } finally {
      this.busy.set(false);
    }
  }

  async cancelEnroll(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.cancelEnroll();
      this.enrollment.set(null);
      this.toasts.success('Enrollment cancelled');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Cancel failed'));
    } finally {
      this.busy.set(false);
    }
  }

  async confirmEnroll(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.api.confirm(this.confirmCode.trim());
      this.recoveryCodes.set(result.recoveryCodes);
      this.enrollment.set(null);
      this.confirmCode = '';
      this.toasts.success('MFA enabled — store your recovery codes');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Confirmation failed'));
    } finally {
      this.busy.set(false);
    }
  }

  async regenerate(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await this.api.regenerateRecovery(this.regenPassword, this.regenCode.trim());
      this.recoveryCodes.set(result.recoveryCodes);
      this.regenPassword = '';
      this.regenCode = '';
      this.toasts.success('Recovery codes regenerated');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Regenerate failed'));
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.disable(this.disablePassword, this.disableCode.trim());
      this.disablePassword = '';
      this.disableCode = '';
      this.recoveryCodes.set([]);
      this.toasts.success('MFA disabled');
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Disable failed'));
    } finally {
      this.busy.set(false);
    }
  }
}
