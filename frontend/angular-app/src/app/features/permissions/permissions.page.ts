import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogPermission } from '../../core/api/page.types';
import { PermissionsApi } from './permissions.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiTable } from '../../shared/ui/table/ui-table';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';
import { UiButton } from '../../shared/ui/button/ui-button';

@Component({
  selector: 'app-permissions-page',
  standalone: true,
  imports: [UiPageHeader, UiTable, UiLoadingState, UiErrorState, UiEmptyState, UiButton],
  template: `
    <div class="admin-page">
      <ui-page-header
        title="Permissions"
        subtitle="Read-only catalog gated by PERMISSION_READ. Codes are owned by the backend."
      />

      <section class="admin-card">
        <div class="admin-card__head">
          <p class="admin-card__eyebrow">Authorization</p>
          <h2 class="admin-card__title">Permission catalog</h2>
          <p class="admin-card__desc">
            Executable permission codes synced from the server. Use roles to attach these to users.
          </p>
        </div>
        <div class="admin-card__body">
          @if (loading()) {
            <ui-loading-state />
          } @else if (error()) {
            <ui-error-state title="Failed to load permissions" [message]="error()!">
              <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
            </ui-error-state>
          } @else if (!items().length) {
            <ui-empty-state title="No permissions in catalog" />
          } @else {
            <ui-table>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Module</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of items(); track p.code) {
                    <tr>
                      <td><code>{{ p.code }}</code></td>
                      <td><span class="admin-status">{{ p.module }}</span></td>
                      <td>{{ p.description || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </ui-table>
          }
        </div>
      </section>
    </div>
  `,
})
export class PermissionsPage implements OnInit {
  private readonly api = inject(PermissionsApi);
  private readonly auth = inject(AuthService);

  readonly items = signal<CatalogPermission[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.items.set(await this.api.list());
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load permissions'));
    } finally {
      this.loading.set(false);
    }
  }
}