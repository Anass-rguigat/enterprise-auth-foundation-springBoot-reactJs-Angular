import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './core/theme/ThemeProvider'
import { PermissionProvider } from './core/permissions/PermissionContext'
import { RequirePermission } from './core/permissions/RequirePermission'
import { AuthProvider } from './core/auth/AuthContext'
import {
  AnonymousRoute,
  AuthBootGate,
  ChangePasswordRoute,
  MfaChallengeRoute,
  ProtectedRoute,
} from './core/auth/RouteGuards'
import { ToastProvider } from './shared/ui'
import { ShellLayout } from './layout/ShellLayout'
import { AuthShellLayout } from './layout/AuthShellLayout'
import { HelloPage } from './features/hello/HelloPage'
import { LoginPage } from './features/auth/LoginPage'
import { MfaChallengePage } from './features/auth/MfaChallengePage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { EmailChangePage } from './features/auth/EmailChangePage'
import { InviteAcceptPage } from './features/invitations/InviteAcceptPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { UsersListPage } from './features/users/UsersListPage'
import { UserCreatePage } from './features/users/UserCreatePage'
import { UserDetailPage } from './features/users/UserDetailPage'
import { UserEditPage } from './features/users/UserEditPage'
import { RolesListPage } from './features/roles/RolesListPage'
import { RoleDetailPage } from './features/roles/RoleDetailPage'
import { RoleCreatePage } from './features/roles/RoleCreatePage'
import { RoleEditPage } from './features/roles/RoleEditPage'
import { PermissionsPage } from './features/permissions/PermissionsPage'
import { AuditPage } from './features/audit/AuditPage'
import { AuditDetailPage } from './features/audit/AuditDetailPage'
import { SecurityPage } from './features/security/SecurityPage'
import { MfaSettingsPage } from './features/mfa-settings/MfaSettingsPage'
import { NotesPage } from './features/notes/NotesPage'
import { NoAccessPage } from './features/access/NoAccessPage'

const queryClient = new QueryClient()

/** Feature modules with nav + route permission gates (backend still authoritative). */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PermissionProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <AuthBootGate>
                  <Routes>
                    <Route element={<AuthShellLayout />}>
                      <Route element={<AnonymousRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                      </Route>
                      <Route element={<MfaChallengeRoute />}>
                        <Route path="/mfa" element={<MfaChallengePage />} />
                      </Route>
                      <Route element={<ChangePasswordRoute />}>
                        <Route path="/change-password" element={<ChangePasswordPage />} />
                      </Route>
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/invite/accept" element={<InviteAcceptPage />} />
                    </Route>

                    <Route element={<ProtectedRoute />}>
                      <Route element={<ShellLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/settings/email" element={<EmailChangePage />} />
                        <Route path="/settings/mfa" element={<MfaSettingsPage />} />
                        <Route path="/security" element={<SecurityPage />} />
                        <Route path="/no-access" element={<NoAccessPage />} />
                        <Route path="/status" element={<HelloPage />} />

                        <Route element={<RequirePermission any={['USER_READ']} />}>
                          <Route path="/users" element={<UsersListPage />} />
                          <Route path="/users/:userId" element={<UserDetailPage />} />
                        </Route>
                        <Route element={<RequirePermission any={['USER_CREATE']} />}>
                          <Route path="/users/new" element={<UserCreatePage />} />
                        </Route>
                        <Route element={<RequirePermission any={['USER_UPDATE']} />}>
                          <Route path="/users/:userId/edit" element={<UserEditPage />} />
                        </Route>

                        <Route element={<RequirePermission any={['ROLE_READ']} />}>
                          <Route path="/roles" element={<RolesListPage />} />
                          <Route path="/roles/:roleCode" element={<RoleDetailPage />} />
                        </Route>
                        <Route element={<RequirePermission any={['ROLE_CREATE']} />}>
                          <Route path="/roles/new" element={<RoleCreatePage />} />
                        </Route>
                        <Route
                          element={
                            <RequirePermission any={['ROLE_UPDATE', 'ROLE_ASSIGN_PERMISSION']} />
                          }
                        >
                          <Route path="/roles/:roleCode/edit" element={<RoleEditPage />} />
                        </Route>

                        <Route element={<RequirePermission any={['PERMISSION_READ']} />}>
                          <Route path="/permissions" element={<PermissionsPage />} />
                        </Route>

                        <Route element={<RequirePermission any={['AUDIT_READ']} />}>
                          <Route path="/audit" element={<AuditPage />} />
                          <Route path="/audit/:id" element={<AuditDetailPage />} />
                        </Route>

                        <Route element={<RequirePermission any={['NOTE_READ']} />}>
                          <Route path="/notes" element={<NotesPage />} />
                        </Route>
                      </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AuthBootGate>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </PermissionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
