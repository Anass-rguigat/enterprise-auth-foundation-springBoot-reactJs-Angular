import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';

/** Shown when the signed-in user lacks permission for the requested route. */
@Component({
  selector: 'app-no-access-page',
  standalone: true,
  imports: [RouterLink, UiButton, UiEmptyState, UiPageHeader],
  template: `
    <ui-page-header title="No access" subtitle="This page is not available for your role." />
    <ui-empty-state
      title="Permission required"
      message="Your account does not include the permission needed to open this page. Ask an administrator if you need access."
    >
      <a routerLink="/dashboard">
        <ui-button variant="secondary">Back to dashboard</ui-button>
      </a>
    </ui-empty-state>
  `,
})
export class NoAccessPage {}
