import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { UiToastHost } from '../../shared/ui/toast/ui-toast-host';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, UiToastHost],
  template: `
    <div class="shell" [class.shell--nav-open]="navOpen()">
      <div class="shell__sidebar">
        <app-sidebar (navigated)="closeNav()" />
      </div>
      @if (navOpen()) {
        <button
          type="button"
          class="shell__scrim"
          aria-label="Close navigation"
          (click)="closeNav()"
        ></button>
      }
      <div class="shell__main">
        <app-topbar (menuToggle)="toggleNav()" />
        <main class="shell__content" [class.shell__content--full]="fullWidth()">
          <router-outlet />
        </main>
      </div>
      <ui-toast-host />
    </div>
  `,
})
export class ShellLayout {
  private readonly router = inject(Router);
  readonly navOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly fullWidth = computed(() =>
    ['/profile', '/users', '/roles', '/permissions', '/audit'].some((p) =>
      (this.url() ?? '').startsWith(p)
    )
  );

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900) {
      this.closeNav();
    }
  }
}
