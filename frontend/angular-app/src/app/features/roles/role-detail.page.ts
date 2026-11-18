import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { CatalogPermission, Role } from '../../core/api/page.types';
import { RolesApi } from './roles.api';
import { PermissionsApi } from '../permissions/permissions.api';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

@Component({
  selector: 'app-role-detail-page',
  standalone: true,
  imports: [NgClass, RouterLink, UiButton, UiLoadingState, UiErrorState],
  template: `
    <div class="admin-page">
      <p class="fp-back">
        <a class="fp-link" routerLink="/roles">← Roles</a>
      </p>

      @if (loading()) {
        <ui-loading-state />
      } @else if (error()) {
        <ui-error-state title="Role not available" [message]="error()!">
          <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
        </ui-error-state>
      } @else if (role(); as r) {
        <section class="admin-card">
          <div class="admin-card__body">
            <div class="users-hero">
              <div>
                <h1 class="users-hero__email">{{ r.name }}</h1>
                <p class="users-hero__meta"><code>{{ r.code }}</code></p>
                <div class="users-hero__badges">
                  <span [ngClass]="r.systemRole ? 'admin-status admin-status--warn' : 'admin-status'">
                    {{ r.systemRole ? 'System role' : 'Custom role' }}
                  </span>
                  <span class="admin-status">{{ r.permissionCodes.length }} permissions</span>
                  <span class="admin-status">{{ r.assignedUserCount }} users</span>
                </div>
              </div>
              @if (canEdit()) {
                <a [routerLink]="['/roles', r.code, 'edit']">
                  <ui-button type="button">Edit role</ui-button>
                </a>
              }
            </div>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Overview</p>
            <h2 class="admin-card__title">Role information</h2>
            <p class="admin-card__desc">Read-only snapshot. Use Edit to change metadata or permissions.</p>
          </div>
          <div class="admin-card__body">
            <dl class="fp-dl fp-dl--cols">
              <div>
                <dt>Code</dt>
                <dd><code>{{ r.code }}</code></dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{{ r.name }}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{{ r.description || '—' }}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{{ r.systemRole ? 'System' : 'Custom' }}</dd>
              </div>
              <div>
                <dt>Assigned users</dt>
                <dd>{{ r.assignedUserCount }}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{{ formatDate(r.createdAt) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card__head">
            <p class="admin-card__eyebrow">Authorization</p>
            <h2 class="admin-card__title">Permissions</h2>
          </div>
          <div class="admin-card__body">
            @if (!permissionDetails().length) {
              <p class="fp-muted">No permissions on this role</p>
            } @else {
              <ul class="users-role-list">
                @for (p of permissionDetails(); track p.code) {
                  <li [title]="p.description || ''">
                    <code>{{ p.code }}</code>
                    @if (p.module && p.module !== '—') {
                      <span class="fp-muted"> · {{ p.module }}</span>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class RoleDetailPage implements OnInit {
  private readonly api = inject(RolesApi);
  private readonly permissionsApi = inject(PermissionsApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly perms = inject(PermissionService);

  readonly role = signal<Role | null>(null);
  readonly catalog = signal<CatalogPermission[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formatDate = formatDate;

  private roleCode = '';

  readonly canEdit = computed(
    () => this.perms.has('ROLE_UPDATE') || this.perms.has('ROLE_ASSIGN_PERMISSION')
  );

  readonly permissionDetails = computed(() => {
    const r = this.role();
    if (!r) return [];
    const byCode = new Map(this.catalog().map((p) => [p.code, p]));
    return r.permissionCodes.map(
      (code) => byCode.get(code) ?? { code, module: '—', description: null }
    );
  });

  ngOnInit(): void {
    this.roleCode = this.route.snapshot.paramMap.get('roleCode') ?? '';
    void this.reload();
    void this.loadCatalog();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.role.set(await this.api.get(this.roleCode));
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load role'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCatalog(): Promise<void> {
    if (!this.perms.has('PERMISSION_READ')) {
      return;
    }
    try {
      this.catalog.set(await this.permissionsApi.list());
    } catch {
      this.catalog.set([]);
    }
  }
}