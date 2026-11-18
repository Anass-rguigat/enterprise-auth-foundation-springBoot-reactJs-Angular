import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';
import { UiLoadingState } from './shared/ui/loading-state/ui-loading-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiLoadingState],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /** Eagerly apply persisted theme before child layouts render. */
  private readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
}
