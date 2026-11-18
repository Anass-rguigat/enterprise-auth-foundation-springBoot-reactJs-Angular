import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiToastHost } from '../../shared/ui/toast/ui-toast-host';

@Component({
  selector: 'app-auth-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, UiButton, UiToastHost],
  template: `
    <div class="auth-shell">
      <header class="auth-shell__bar">
        <a routerLink="/dashboard" class="auth-shell__brand">Enterprise Auth</a>
        <ui-button variant="ghost" type="button" (click)="theme.toggle()">
          {{ theme.mode() === 'dark' ? 'Light' : 'Dark' }} theme
        </ui-button>
      </header>
      <main class="auth-shell__main">
        <router-outlet />
      </main>
      <ui-toast-host />
    </div>
  `,
})
export class AuthShellLayout {
  readonly theme = inject(ThemeService);
}
