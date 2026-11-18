import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { UiButton } from '../../shared/ui/button/ui-button';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, UiButton],
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button
          type="button"
          class="topbar__menu"
          aria-label="Open navigation"
          (click)="menuToggle.emit()"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" />
          </svg>
        </button>
        <div class="topbar__context">
          <p class="topbar__title">Workspace</p>
          @if (auth.user(); as user) {
            <p class="topbar__hint">
              {{ auth.displayName() }}
              @if (!user.emailVerified) {
                <span class="topbar__badge">Email unverified</span>
              }
            </p>
          } @else {
            <p class="topbar__hint">Session ready</p>
          }
        </div>
      </div>
      <div class="topbar__actions">
        <ui-button variant="ghost" type="button" (click)="theme.toggle()">
          {{ theme.mode() === 'dark' ? 'Light' : 'Dark' }}
        </ui-button>
        @if (auth.isAuthenticated()) {
          <a routerLink="/profile" class="topbar__user" title="Open profile">
            <span class="topbar__avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="topbar__user-text">
              <span class="topbar__user-name">{{ auth.displayName() }}</span>
              <span class="topbar__user-email">{{ auth.user()?.email }}</span>
            </span>
          </a>
          <ui-button variant="secondary" type="button" [loading]="busy()" (click)="onLogout()">
            Sign out
          </ui-button>
        } @else {
          <a routerLink="/login" class="topbar__link">Sign in</a>
        }
      </div>
    </header>
  `,
})
export class TopbarComponent {
  @Output() readonly menuToggle = new EventEmitter<void>();
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly busy = signal(false);

  readonly initials = computed(() => {
    const name = this.auth.displayName() || this.auth.user()?.email || '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  async onLogout(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.logout();
    } finally {
      this.busy.set(false);
    }
  }
}