import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_GROUPS, SHELL_NAV } from '../../core/nav/nav.config';
import { PermissionService } from '../../core/permissions/permission.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [attr.aria-label]="'Main navigation'">
      <div class="sidebar__brand">
        <span class="sidebar__mark" aria-hidden="true"></span>
        <div>
          <p class="sidebar__product">Enterprise Auth</p>
          <p class="sidebar__edition">Control plane</p>
        </div>
      </div>

      <nav class="sidebar__nav">
        @for (group of groups; track group.id) {
          @if (visibleByGroup()[group.id!]?.length) {
            <div class="sidebar__section">
              <p class="sidebar__group">{{ group.label }}</p>
              <ul class="sidebar__list">
                @for (item of visibleByGroup()[group.id!]; track item.path) {
                  <li>
                    <a
                      class="sidebar__link"
                      [routerLink]="item.path"
                      routerLinkActive="sidebar__link--active"
                      (click)="navigated.emit()"
                    >
                      <span class="sidebar__icon" aria-hidden="true">
                        @switch (item.path) {
                          @case ('/dashboard') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                            </svg>
                          }
                          @case ('/profile') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="8" r="3.25" stroke="currentColor" stroke-width="1.6" />
                              <path
                                d="M5 19c1.5-3.2 4-4.8 7-4.8s5.5 1.6 7 4.8"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                            </svg>
                          }
                          @case ('/users') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6" />
                              <path
                                d="M3.5 19c1.2-2.8 3.2-4.2 5.5-4.2S13.3 16.2 14.5 19"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                              <circle cx="17" cy="9" r="2.25" stroke="currentColor" stroke-width="1.6" />
                              <path
                                d="M15 19c.6-1.7 1.7-2.8 3.2-3.3"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                            </svg>
                          }
                          @case ('/roles') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <rect
                                x="4"
                                y="4"
                                width="16"
                                height="16"
                                rx="2"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                              <path
                                d="M8 9h8M8 12h8M8 15h5"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                            </svg>
                          }
                          @case ('/permissions') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M12 3 5 6.5v5.2c0 4.1 2.8 7.8 7 8.8 4.2-1 7-4.7 7-8.8V6.5L12 3Z"
                                stroke="currentColor"
                                stroke-width="1.6"
                                stroke-linejoin="round"
                              />
                            </svg>
                          }
                          @case ('/audit') {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M8 4h9a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                              <path
                                d="M10 9h6M10 12h6M10 15h4"
                                stroke="currentColor"
                                stroke-width="1.6"
                              />
                            </svg>
                          }
                        }
                      </span>
                      <span class="sidebar__label">{{ item.label }}</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        }
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  @Output() readonly navigated = new EventEmitter<void>();

  private readonly permissions = inject(PermissionService);
  readonly groups = NAV_GROUPS;

  readonly visibleByGroup = computed(() => {
    const map: Record<string, typeof SHELL_NAV> = {};
    for (const group of NAV_GROUPS) {
      map[group.id!] = SHELL_NAV.filter(
        (item) => item.group === group.id && this.permissions.hasAny(item.permissions)
      );
    }
    return map;
  });
}