import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiButton } from '../../shared/ui/button/ui-button';

type MetaInfo = {
  application: string;
  status: string;
  phase: string;
};

@Component({
  selector: 'app-hello-page',
  standalone: true,
  imports: [UiPageHeader, UiLoadingState, UiErrorState, UiButton],
  templateUrl: './hello.page.html',
  styleUrl: './hello.page.css',
})
export class HelloPage implements OnInit {
  readonly apiBase = environment.apiBaseUrl;
  readonly meta = signal<MetaInfo | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<MetaInfo>(`${this.apiBase}/api/v1/meta/info`).subscribe({
      next: (body) => {
        this.meta.set(body);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(
          `Could not reach ${this.apiBase}/api/v1/meta/info. Start the backend, then refresh.`
        );
        this.loading.set(false);
      },
    });
  }
}
