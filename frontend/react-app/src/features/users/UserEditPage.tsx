import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { AdminUser, Role } from '../../core/api/page.types'
import {
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  useToast,
} from '../../shared/ui'
import { rolesApi } from '../roles/roles.api'
import { usersApi } from './users.api'
import '../feature-pages.css'
import './users.css'

export function UserEditPage() {
  const { userId = '' } = useParams()
  const auth = useAuth()
  const perms = usePermissions()
  const toast = useToast()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [catalog, setCatalog] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [grantPassword, setGrantPassword] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [organization, setOrganization] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [timezone, setTimezone] = useState('')
  const [bio, setBio] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())

  const isSuperAdmin = !!auth.user?.roles.includes('SUPER_ADMIN')
  const loginEnabled = !!user && user.status === 'ACTIVE' && user.emailVerified

  const assignableRoles = useMemo(
    () => catalog.filter((r) => r.code !== 'SUPER_ADMIN'),
    [catalog],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const u = await usersApi.get(userId)
      setUser(u)
      setFirstName(u.firstName ?? '')
      setLastName(u.lastName ?? '')
      setPhone(u.phone ?? '')
      setSelectedRoles(new Set(u.roles.filter((r) => r !== 'SUPER_ADMIN')))
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load user'))
    } finally {
      setLoading(false)
    }
  }, [auth, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!perms.has('ROLE_READ') && !perms.has('USER_ASSIGN_ROLE')) return
    void rolesApi
      .list()
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [perms])

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Action failed'))
    } finally {
      setBusy(false)
    }
  }

  function toggleRole(code: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!perms.has('USER_UPDATE')) return
    setSaving(true)
    setFormError('')
    try {
      await usersApi.update(userId, {
        firstName,
        lastName,
        phone,
        jobTitle: jobTitle || undefined,
        department: department || undefined,
        organization: organization || undefined,
        city: city || undefined,
        country: country || undefined,
        preferredLanguage: preferredLanguage || undefined,
        timezone: timezone || undefined,
        bio: bio || undefined,
      })

      if (perms.has('USER_ASSIGN_ROLE') && user) {
        const current = new Set(user.roles.filter((r) => r !== 'SUPER_ADMIN'))
        for (const code of selectedRoles) {
          if (!current.has(code)) await usersApi.assignRole(userId, code)
        }
        for (const code of current) {
          if (!selectedRoles.has(code)) await usersApi.removeRole(userId, code)
        }
      }

      toast.success('User updated')
      await reload()
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not save user'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to={`/users/${userId}`}>
          ← Back to details
        </Link>
      </p>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="User not available" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : user ? (
        <>
          <PageHeader
            title={`Edit ${user.firstName || user.email}`}
            subtitle={user.email}
          >
            <span
              className={`admin-status${loginEnabled ? ' admin-status--ok' : ' admin-status--danger'}`}
            >
              {loginEnabled ? 'Can sign in' : 'Cannot sign in'}
            </span>
          </PageHeader>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Profile</p>
              <h2 className="admin-card__title">Personal information</h2>
              <p className="admin-card__desc">
                Update names and contact details. Email changes are handled by the user from their
                profile.
              </p>
            </div>
            <div className="admin-card__body">
              <form onSubmit={saveProfile} noValidate>
                <div className="admin-grid">
                  <Field label="Email" htmlFor="ue-email">
                    <Input id="ue-email" value={user.email} disabled readOnly />
                  </Field>
                  <Field label="Phone" htmlFor="ue-phone">
                    <Input
                      id="ue-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="First name" htmlFor="ue-first">
                    <Input
                      id="ue-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Last name" htmlFor="ue-last">
                    <Input
                      id="ue-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Job title" htmlFor="ue-job">
                    <Input
                      id="ue-job"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="Department" htmlFor="ue-dept">
                    <Input
                      id="ue-dept"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </Field>
                  <Field label="Organization" htmlFor="ue-org">
                    <Input
                      id="ue-org"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </Field>
                  <Field label="City" htmlFor="ue-city">
                    <Input id="ue-city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </Field>
                  <Field label="Country" htmlFor="ue-country">
                    <Input
                      id="ue-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </Field>
                  <Field label="Language" htmlFor="ue-lang">
                    <Input
                      id="ue-lang"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    />
                  </Field>
                  <Field label="Timezone" htmlFor="ue-tz">
                    <Input
                      id="ue-tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    />
                  </Field>
                  <div className="admin-grid--full">
                    <Field label="About" htmlFor="ue-bio">
                      <textarea
                        id="ue-bio"
                        className="fp-textarea"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>

                {perms.has('USER_ASSIGN_ROLE') ? (
                  <>
                    <hr style={{ margin: '1.25rem 0', border: 0, borderTop: '1px solid var(--color-border)' }} />
                    <p className="admin-card__eyebrow">Roles</p>
                    <h3 className="admin-card__title" style={{ marginBottom: '0.75rem' }}>
                      Assign roles
                    </h3>
                    <p className="admin-card__desc" style={{ marginBottom: '1rem' }}>
                      Tick the roles this user should have. Changes are saved with the form.
                    </p>
                    <div className="users-role-grid">
                      {assignableRoles.map((role) => (
                        <div key={role.code} className="users-role-chip">
                          <Checkbox
                            id={`ue-role-${role.code}`}
                            checked={selectedRoles.has(role.code)}
                            onChange={() => toggleRole(role.code)}
                          >
                            <strong>{role.name}</strong>
                            <span>{role.code}</span>
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                    {user.roles.includes('SUPER_ADMIN') ? (
                      <p className="fp-muted" style={{ marginTop: '0.75rem' }}>
                        This user also has SUPER_ADMIN (managed separately below).
                      </p>
                    ) : null}
                  </>
                ) : null}

                {formError ? (
                  <p className="fp-err" role="alert">
                    {formError}
                  </p>
                ) : null}
                <div className="fp-row" style={{ marginTop: '1rem' }}>
                  <Button type="submit" loading={saving}>
                    Save changes
                  </Button>
                  <Link to={`/users/${userId}`}>
                    <Button variant="secondary" type="button">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Security</p>
              <h2 className="admin-card__title">Access controls</h2>
              <p className="admin-card__desc">
                Each action is explained below so you know what happens before you click.
              </p>
            </div>
            <div className="admin-card__body">
              <div className="users-action-grid">
                {perms.has('USER_ACTIVATE') && user.status !== 'ACTIVE' ? (
                  <div className="users-action-card">
                    <h3>Enable login</h3>
                    <p>
                      Sets the account to Active so the user can sign in again (if their email is
                      verified).
                    </p>
                    <Button
                      type="button"
                      loading={busy}
                      onClick={() => void run(() => usersApi.activate(userId), 'Login enabled')}
                    >
                      Enable login
                    </Button>
                  </div>
                ) : null}

                {perms.has('USER_SUSPEND') && user.status === 'ACTIVE' ? (
                  <div className="users-action-card">
                    <h3>Disable login</h3>
                    <p>
                      Blocks sign-in immediately and ends their current sessions. They cannot use
                      the API until you enable them again.
                    </p>
                    <Button
                      variant="danger"
                      type="button"
                      loading={busy}
                      onClick={() => void run(() => usersApi.disable(userId), 'Login disabled')}
                    >
                      Disable login
                    </Button>
                  </div>
                ) : null}

                {perms.has('USER_REVOKE_TOKENS') ? (
                  <div className="users-action-card">
                    <h3>Revoke sessions</h3>
                    <p>
                      Signs the user out everywhere now, without disabling the account. Useful if a
                      device is lost or a session looks suspicious.
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      loading={busy}
                      onClick={() =>
                        void run(() => usersApi.revokeSessions(userId), 'All sessions revoked')
                      }
                    >
                      Revoke all sessions
                    </Button>
                  </div>
                ) : null}

                {perms.has('USER_RESET_PASSWORD') ? (
                  <div className="users-action-card">
                    <h3>Reset password</h3>
                    <p>
                      Sends a password-reset email, forces a password change, and ends current
                      sessions. The user picks a new password from the email link.
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      loading={busy}
                      disabled={user.status !== 'ACTIVE'}
                      onClick={() =>
                        void run(() => usersApi.forcePasswordReset(userId), 'Password reset sent')
                      }
                    >
                      Send password reset
                    </Button>
                  </div>
                ) : null}

                {perms.has('MFA_ADMIN_RESET') ? (
                  <div className="users-action-card">
                    <h3>Reset MFA</h3>
                    <p>
                      Removes their authenticator setup so they can enroll MFA again. Use when they
                      lost their phone or authenticator app.
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      loading={busy}
                      onClick={() => void run(() => usersApi.resetMfa(userId), 'MFA reset')}
                    >
                      Reset MFA
                    </Button>
                  </div>
                ) : null}

                {perms.has('USER_INVITE') && user.status === 'PENDING_ACTIVATION' ? (
                  <div className="users-action-card">
                    <h3>Resend invitation</h3>
                    <p>
                      Sends a fresh invite email so they can verify their address and set a
                      password.
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      loading={busy}
                      onClick={() =>
                        void run(() => usersApi.sendInvitation(userId), 'Invitation sent')
                      }
                    >
                      Resend invite
                    </Button>
                  </div>
                ) : null}

                {isSuperAdmin && !user.roles.includes('SUPER_ADMIN') ? (
                  <div className="users-action-card">
                    <h3>Grant SUPER_ADMIN</h3>
                    <p>
                      Highest privilege. Confirm with your own password. Prefer ordinary roles when
                      possible.
                    </p>
                    <Field label="Your password" htmlFor="grant-pw">
                      <Input
                        id="grant-pw"
                        type="password"
                        value={grantPassword}
                        onChange={(e) => setGrantPassword(e.target.value)}
                      />
                    </Field>
                    <Button
                      variant="danger"
                      type="button"
                      loading={busy}
                      onClick={() => {
                        if (!grantPassword) {
                          toast.warning('Password required')
                          return
                        }
                        void run(async () => {
                          await usersApi.grantSuperAdmin(userId, grantPassword)
                          setGrantPassword('')
                        }, 'SUPER_ADMIN granted')
                      }}
                    >
                      Grant SUPER_ADMIN
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
