import { Routes } from '@angular/router';
import { ShellLayout } from './layout/shell/shell.layout';
import { AuthShellLayout } from './layout/auth-shell/auth-shell.layout';
import { HelloPage } from './features/hello/hello.page';
import { LoginPage } from './features/auth/login/login.page';
import { MfaChallengePage } from './features/auth/mfa/mfa-challenge.page';
import { ForgotPasswordPage } from './features/auth/forgot-password/forgot-password.page';
import { ResetPasswordPage } from './features/auth/reset-password/reset-password.page';
import { ChangePasswordPage } from './features/auth/change-password/change-password.page';
import { VerifyEmailPage } from './features/auth/verify-email/verify-email.page';
import { EmailChangePage } from './features/auth/email-change/email-change.page';
import { InviteAcceptPage } from './features/invitations/invite-accept.page';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { ProfilePage } from './features/profile/profile.page';
import { UsersListPage } from './features/users/users-list.page';
import { UserCreatePage } from './features/users/user-create.page';
import { UserDetailPage } from './features/users/user-detail.page';
import { UserEditPage } from './features/users/user-edit.page';
import { RolesListPage } from './features/roles/roles-list.page';
import { RoleCreatePage } from './features/roles/role-create.page';
import { RoleDetailPage } from './features/roles/role-detail.page';
import { RoleEditPage } from './features/roles/role-edit.page';
import { PermissionsPage } from './features/permissions/permissions.page';
import { AuditPage } from './features/audit/audit.page';
import { AuditDetailPage } from './features/audit/audit-detail.page';
import { SecurityPage } from './features/security/security.page';
import { MfaSettingsPage } from './features/mfa-settings/mfa-settings.page';
import { NotesPage } from './features/notes/notes.page';
import { NoAccessPage } from './features/access/no-access.page';
import { RequirePermissionComponent } from './core/permissions/require-permission.component';
import {
  anonymousGuard,
  authGuard,
  changePasswordGuard,
  mfaChallengeGuard,
} from './core/auth/auth.guards';

/**
 * Feature modules with nav + route permission gates (backend still authoritative).
 * Shell routes are listed before AuthShell so `/` hits authGuard → /login (not an empty auth outlet).
 */
export const routes: Routes = [
  {
    path: '',
    component: ShellLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPage },
      { path: 'profile', component: ProfilePage },
      { path: 'settings/email', component: EmailChangePage },
      { path: 'settings/mfa', component: MfaSettingsPage },
      { path: 'security', component: SecurityPage },
      { path: 'no-access', component: NoAccessPage },
      { path: 'status', component: HelloPage },

      {
        path: 'users',
        children: [
          {
            path: 'new',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['USER_CREATE'] },
            children: [{ path: '', component: UserCreatePage }],
          },
          {
            path: ':userId/edit',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['USER_UPDATE'] },
            children: [{ path: '', component: UserEditPage }],
          },
          {
            path: ':userId',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['USER_READ'] },
            children: [{ path: '', component: UserDetailPage }],
          },
          {
            path: '',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['USER_READ'] },
            children: [{ path: '', component: UsersListPage }],
          },
        ],
      },

      {
        path: 'roles',
        children: [
          {
            path: 'new',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['ROLE_CREATE'] },
            children: [{ path: '', component: RoleCreatePage }],
          },
          {
            path: ':roleCode/edit',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['ROLE_UPDATE', 'ROLE_ASSIGN_PERMISSION'] },
            children: [{ path: '', component: RoleEditPage }],
          },
          {
            path: ':roleCode',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['ROLE_READ'] },
            children: [{ path: '', component: RoleDetailPage }],
          },
          {
            path: '',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['ROLE_READ'] },
            children: [{ path: '', component: RolesListPage }],
          },
        ],
      },

      {
        path: 'permissions',
        component: RequirePermissionComponent,
        data: { permissionsAny: ['PERMISSION_READ'] },
        children: [{ path: '', component: PermissionsPage }],
      },

      {
        path: 'audit',
        children: [
          {
            path: ':id',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['AUDIT_READ'] },
            children: [{ path: '', component: AuditDetailPage }],
          },
          {
            path: '',
            component: RequirePermissionComponent,
            data: { permissionsAny: ['AUDIT_READ'] },
            children: [{ path: '', component: AuditPage }],
          },
        ],
      },

      {
        path: 'notes',
        component: RequirePermissionComponent,
        data: { permissionsAny: ['NOTE_READ'] },
        children: [{ path: '', component: NotesPage }],
      },
    ],
  },
  {
    path: '',
    component: AuthShellLayout,
    children: [
      { path: 'login', component: LoginPage, canActivate: [anonymousGuard] },
      { path: 'mfa', component: MfaChallengePage, canActivate: [mfaChallengeGuard] },
      { path: 'forgot-password', component: ForgotPasswordPage, canActivate: [anonymousGuard] },
      { path: 'reset-password', component: ResetPasswordPage, canActivate: [anonymousGuard] },
      { path: 'change-password', component: ChangePasswordPage, canActivate: [changePasswordGuard] },
      { path: 'verify-email', component: VerifyEmailPage },
      { path: 'invite/accept', component: InviteAcceptPage },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
