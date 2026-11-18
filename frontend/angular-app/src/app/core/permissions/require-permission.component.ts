import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { NoAccessPage } from '../../features/access/no-access.page';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { PermissionService } from './permission.service';

/**
 * Route gate for shell pages. Keeps the URL and shows No access when denied.
 * Backend @PreAuthorize remains authoritative for API calls.
 *
 * Route data:
 * - permissionsAny?: string[] — need at least one
 * - permissionsAll?: string[] — need every code
 */
@Component({
  selector: 'app-require-permission',
  standalone: true,
  imports: [RouterOutlet, UiLoadingState, NoAccessPage],
  template: `
    @if (!perms.loaded()) {
      <div class="perm-gate">
        <ui-loading-state label="Checking access…" />
      </div>
    } @else if (!allowed()) {
      <app-no-access-page />
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    .perm-gate {
      display: grid;
      place-items: center;
      min-height: 40vh;
    }
  `,
})
export class RequirePermissionComponent {
  readonly perms = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);

  private readonly routeData = toSignal(this.route.data.pipe(map((d) => d)), {
    initialValue: this.route.snapshot.data,
  });

  readonly allowed = computed(() => {
    const data = this.routeData();
    const all = data['permissionsAll'] as string[] | undefined;
    const any = data['permissionsAny'] as string[] | undefined;
    if (all?.length) {
      return this.perms.hasAll(all);
    }
    return this.perms.hasAny(any);
  });
}
