import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import type {
  MfaEnrollmentStart,
  MfaStatus,
  SecurityOverview,
  SessionSummary,
} from '../../core/api/page.types'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Table,
  useToast,
} from '../../shared/ui'
import { mfaApi } from '../mfa-settings/mfa.api'
import { securityApi } from '../security/security.api'
import { profileApi } from './profile.api'
import './profile.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase()
  return (email || '?').slice(0, 2).toUpperCase()
}

export function ProfilePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [timezone, setTimezone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [organization, setOrganization] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [bio, setBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [overview, setOverview] = useState<SecurityOverview | null>(null)

  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null)
  const [enrollment, setEnrollment] = useState<MfaEnrollmentStart | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [mfaBusy, setMfaBusy] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionBusyId, setSessionBusyId] = useState<string | null>(null)
  const [signingOutAll, setSigningOutAll] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [profile, mfa, sessionList, security] = await Promise.all([
        profileApi.getMine(),
        mfaApi.status(),
        securityApi.sessions(),
        securityApi.overview(),
      ])
      setFirstName(profile.firstName ?? '')
      setLastName(profile.lastName ?? '')
      setPhone(profile.phone ?? '')
      setPreferredLanguage(profile.preferredLanguage ?? '')
      setTimezone(profile.timezone ?? '')
      setJobTitle(profile.jobTitle ?? '')
      setDepartment(profile.department ?? '')
      setOrganization(profile.organization ?? '')
      setCity(profile.city ?? '')
      setCountry(profile.country ?? '')
      setBio(profile.bio ?? '')
      setMfaStatus(mfa)
      setOverview(security)
      if (!mfa.enrollmentPending) setEnrollment(null)
      if (!mfa.enabled) setShowDisableForm(false)
      setSessions(sessionList)
    } catch (err) {
      setLoadError(auth.problemMessage(err, 'Failed to load profile'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  const mfaOn = Boolean(mfaStatus?.enabled || enrollment || mfaStatus?.enrollmentPending)
  const displayName = useMemo(() => auth.displayName || auth.user?.email || 'Account', [auth])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    try {
      await profileApi.updateMine({
        firstName,
        lastName,
        phone,
        preferredLanguage,
        timezone,
        jobTitle,
        department,
        organization,
        city,
        country,
        bio,
      })
      toast.success('Profile updated')
      await reload()
    } catch (err) {
      setProfileError(auth.problemMessage(err, 'Could not save profile'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    const value = newEmail.trim()
    setEmailError(value.includes('@') ? '' : 'Enter a valid email')
    if (!value.includes('@')) return
    setEmailBusy(true)
    try {
      await auth.beginEmailChange(value)
      toast.success(
        'Verification email sent. Open Mailpit (localhost:8026) in local dev, then confirm the link.',
      )
      setNewEmail('')
      await reload()
    } catch (err) {
      setEmailError(auth.problemMessage(err, 'Could not start email change'))
    } finally {
      setEmailBusy(false)
    }
  }

  async function onMfaToggle(wantEnabled: boolean) {
    if (!mfaStatus || mfaBusy) return
    if (wantEnabled && !mfaStatus.enabled) {
      setMfaBusy(true)
      try {
        setEnrollment(await mfaApi.enroll())
        setShowDisableForm(false)
        await reload()
      } catch (err) {
        toast.danger(auth.problemMessage(err, 'Could not start MFA enrollment'))
      } finally {
        setMfaBusy(false)
      }
      return
    }
    if (!wantEnabled && mfaStatus.enabled) {
      setShowDisableForm(true)
      return
    }
    if (!wantEnabled && (enrollment || mfaStatus.enrollmentPending)) {
      setMfaBusy(true)
      try {
        await mfaApi.cancelEnroll()
        setEnrollment(null)
        toast.success('Enrollment cancelled')
        await reload()
      } catch (err) {
        toast.danger(auth.problemMessage(err, 'Cancel failed'))
      } finally {
        setMfaBusy(false)
      }
    }
  }

  async function confirmEnroll() {
    setMfaBusy(true)
    try {
      const result = await mfaApi.confirm(confirmCode.trim())
      setRecoveryCodes(result.recoveryCodes)
      setEnrollment(null)
      setConfirmCode('')
      toast.success('MFA enabled — store your recovery codes')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Confirmation failed'))
    } finally {
      setMfaBusy(false)
    }
  }

  async function disableMfa(event: FormEvent) {
    event.preventDefault()
    setMfaBusy(true)
    try {
      await mfaApi.disable(disablePassword, disableCode.trim())
      setDisablePassword('')
      setDisableCode('')
      setShowDisableForm(false)
      setRecoveryCodes([])
      toast.success('MFA disabled')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Disable failed'))
    } finally {
      setMfaBusy(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError('')
    if (!currentPassword || newPassword.length < 8) {
      setPasswordError('Current password required; new password must be at least 8 characters')
      return
    }
    setPasswordBusy(true)
    try {
      await auth.changePassword(currentPassword, newPassword)
      toast.success('Password updated. Sign in again.')
      await navigate('/login')
    } catch (err) {
      setPasswordError(auth.problemMessage(err, 'Could not change password'))
    } finally {
      setPasswordBusy(false)
    }
  }

  async function revoke(familyId: string) {
    setSessionBusyId(familyId)
    try {
      await securityApi.revokeSession(familyId)
      toast.success('Session revoked')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Could not revoke session'))
    } finally {
      setSessionBusyId(null)
    }
  }

  async function signOutAll() {
    setSigningOutAll(true)
    try {
      await auth.logoutAll()
      toast.success('Signed out of all sessions')
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Could not sign out all sessions'))
    } finally {
      setSigningOutAll(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your account, MFA, password, and sessions." />
      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState title="Could not load profile" message={loadError}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : (
        <div className="profile">
          <header className="profile__hero">
            <div className="profile__avatar" aria-hidden>
              {initials(displayName, auth.user?.email ?? '')}
            </div>
            <div>
              <h2 className="profile__name">{displayName}</h2>
              <p className="profile__email">{auth.user?.email}</p>
              <div className="profile__badges">
                <span
                  className={`profile__badge ${auth.user?.emailVerified ? 'profile__badge--ok' : 'profile__badge--warn'}`}
                >
                  {auth.user?.emailVerified ? 'Email verified' : 'Email unverified'}
                </span>
                <span
                  className={`profile__badge ${mfaStatus?.enabled ? 'profile__badge--ok' : ''}`}
                >
                  MFA {mfaStatus?.enabled ? 'enabled' : 'disabled'}
                </span>
                {overview?.pendingEmail ? (
                  <span className="profile__badge profile__badge--warn">
                    Pending: {overview.pendingEmail}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <section className="profile__card">
            <div className="profile__card-head">
              <p className="profile__card-eyebrow">Account</p>
              <h3 className="profile__card-title">Personal information</h3>
              <p className="profile__card-desc">
                Update how you appear in the product. Email changes require verification on the new
                address.
              </p>
            </div>
            <div className="profile__card-body">
              <form onSubmit={saveProfile} noValidate>
                <div className="profile__grid">
                  <Field label="First name" htmlFor="pf-first">
                    <Input
                      id="pf-first"
                      name="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Last name" htmlFor="pf-last">
                    <Input
                      id="pf-last"
                      name="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Job title" htmlFor="pf-job">
                    <Input
                      id="pf-job"
                      name="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </Field>
                  <Field label="Department" htmlFor="pf-dept">
                    <Input
                      id="pf-dept"
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </Field>
                  <Field label="Organization" htmlFor="pf-org">
                    <Input
                      id="pf-org"
                      name="organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </Field>
                  <Field label="Phone" htmlFor="pf-phone">
                    <Input
                      id="pf-phone"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="City" htmlFor="pf-city">
                    <Input
                      id="pf-city"
                      name="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </Field>
                  <Field label="Country" htmlFor="pf-country">
                    <Input
                      id="pf-country"
                      name="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </Field>
                  <Field label="Preferred language" htmlFor="pf-lang">
                    <Input
                      id="pf-lang"
                      name="lang"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    />
                  </Field>
                  <Field label="Timezone" htmlFor="pf-tz">
                    <Input
                      id="pf-tz"
                      name="tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    />
                  </Field>
                  <div className="profile__grid--full">
                    <Field label="About" htmlFor="pf-bio">
                      <textarea
                        id="pf-bio"
                        name="bio"
                        className="profile__textarea"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                {profileError ? (
                  <p className="profile__err" role="alert">
                    {profileError}
                  </p>
                ) : null}
                <div className="profile__actions" style={{ marginTop: '1rem' }}>
                  <Button type="submit" loading={savingProfile}>
                    Save information
                  </Button>
                </div>
              </form>

              <hr className="profile__divider" />

              <form onSubmit={changeEmail} noValidate>
                <p className="profile__card-eyebrow">Email address</p>
                <h4 className="profile__card-title" style={{ marginBottom: '0.75rem' }}>
                  Update email
                </h4>
                <div className="profile__grid">
                  <Field label="Current email" htmlFor="pf-email-current">
                    <Input
                      id="pf-email-current"
                      value={auth.user?.email ?? ''}
                      readOnly
                      disabled
                    />
                  </Field>
                  <Field label="New email" htmlFor="pf-email-new" error={emailError || undefined}>
                    <Input
                      id="pf-email-new"
                      type="email"
                      name="newEmail"
                      autoComplete="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      invalid={!!emailError}
                      placeholder="you@company.com"
                    />
                  </Field>
                </div>
                {overview?.pendingEmail ? (
                  <p className="profile__hint">
                    Pending verification for <strong>{overview.pendingEmail}</strong>. Your login
                    email stays the same until you open the confirmation link. In local
                    development, open{' '}
                    <a className="fp-link" href="http://localhost:8026" target="_blank" rel="noreferrer">
                      Mailpit
                    </a>{' '}
                    to find that message (it is not delivered to real Gmail).
                  </p>
                ) : (
                  <p className="profile__hint">
                    Your email does not change immediately. We send a confirmation link to the new
                    address first. After you confirm it, the new email becomes your login email.
                    Locally, messages appear in{' '}
                    <a className="fp-link" href="http://localhost:8026" target="_blank" rel="noreferrer">
                      Mailpit
                    </a>
                    , not in Gmail.
                  </p>
                )}
                <div className="profile__actions">
                  <Button type="submit" variant="secondary" loading={emailBusy}>
                    Send verification email
                  </Button>
                </div>
              </form>
            </div>
          </section>

          <section className="profile__card">
            <div className="profile__card-head">
              <p className="profile__card-eyebrow">Authentication</p>
              <h3 className="profile__card-title">Multi-factor authentication</h3>
              <p className="profile__card-desc">
                Use an authenticator app for a second factor when signing in.
              </p>
            </div>
            <div className="profile__card-body">
              <div className="profile__switch-row">
                <div className="profile__switch-copy">
                  <h3>{mfaStatus?.enabled ? 'MFA is enabled' : 'MFA is disabled'}</h3>
                  <p className="profile__hint">
                    {mfaStatus?.enrollmentPending
                      ? 'Enrollment pending — confirm with a code from your app.'
                      : mfaStatus?.enabled
                        ? `${mfaStatus.unusedRecoveryCodes} recovery codes remaining.`
                        : 'Slide the switch on to start enrollment.'}
                  </p>
                </div>
                <label className="profile__switch">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Enable MFA"
                    checked={mfaOn}
                    disabled={mfaBusy}
                    onChange={(e) => void onMfaToggle(e.target.checked)}
                  />
                  <span className="profile__switch-track" aria-hidden />
                </label>
              </div>

              {enrollment ? (
                <div className="profile__secret">
                  <p className="profile__hint">
                    Add this secret to your authenticator app, then confirm with a TOTP code.
                  </p>
                  <p>
                    <strong>Secret:</strong> <code>{enrollment.secretBase32}</code>
                  </p>
                  <p>
                    <strong>otpauth:</strong> <code>{enrollment.otpauthUri}</code>
                  </p>
                  <Field label="Confirmation code" htmlFor="mfa-confirm">
                    <Input
                      id="mfa-confirm"
                      name="confirm"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                    />
                  </Field>
                  <div className="profile__actions">
                    <Button type="button" loading={mfaBusy} onClick={() => void confirmEnroll()}>
                      Confirm MFA
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      loading={mfaBusy}
                      onClick={() => void onMfaToggle(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {recoveryCodes.length ? (
                <div className="profile__secret">
                  <strong>Recovery codes (shown once)</strong>
                  <ul className="profile__codes">
                    {recoveryCodes.map((c) => (
                      <li key={c}>
                        <code>{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {showDisableForm && mfaStatus?.enabled ? (
                <form onSubmit={disableMfa} noValidate>
                  <p className="profile__hint">
                    Confirm with your password and a TOTP or recovery code to disable MFA.
                  </p>
                  <div className="profile__grid">
                    <Field label="Password" htmlFor="dis-pw">
                      <Input
                        id="dis-pw"
                        type="password"
                        name="disPw"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="TOTP / recovery code" htmlFor="dis-code">
                      <Input
                        id="dis-code"
                        name="disCode"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                  <div className="profile__actions" style={{ marginTop: '1rem' }}>
                    <Button variant="danger" type="submit" loading={mfaBusy}>
                      Disable MFA
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setShowDisableForm(false)
                        setDisablePassword('')
                        setDisableCode('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          </section>

          <section className="profile__card">
            <div className="profile__card-head">
              <p className="profile__card-eyebrow">Authentication</p>
              <h3 className="profile__card-title">Change password</h3>
              <p className="profile__card-desc">
                Updates your password and signs you out of every session so you can sign in again.
              </p>
            </div>
            <div className="profile__card-body">
              <form onSubmit={changePassword} noValidate>
                <div className="profile__grid">
                  <Field label="Current password" htmlFor="chg-current">
                    <Input
                      id="chg-current"
                      type="password"
                      name="currentPassword"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="New password" htmlFor="chg-new">
                    <Input
                      id="chg-new"
                      type="password"
                      name="newPassword"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </Field>
                </div>
                {passwordError ? (
                  <p className="profile__err" role="alert">
                    {passwordError}
                  </p>
                ) : null}
                <div className="profile__actions">
                  <Button type="submit" loading={passwordBusy}>
                    Update password
                  </Button>
                </div>
              </form>
            </div>
          </section>

          <section className="profile__card">
            <div className="profile__card-head">
              <p className="profile__card-eyebrow">Security</p>
              <h3 className="profile__card-title">Sessions</h3>
              <p className="profile__card-desc">
                Review where you are signed in. Sign out all ends every active session immediately.
              </p>
            </div>
            <div className="profile__card-body">
              <div className="profile__actions">
                <Button
                  variant="danger"
                  type="button"
                  loading={signingOutAll}
                  onClick={() => void signOutAll()}
                >
                  Sign out all sessions
                </Button>
                <p className="profile__hint">
                  {overview ? `${overview.activeSessionCount} active session(s)` : null}
                </p>
              </div>
              {!sessions.length ? (
                <EmptyState title="No active sessions" />
              ) : (
                <div className="profile__sessions">
                  <Table>
                    <table>
                      <thead>
                        <tr>
                          <th>Device / label</th>
                          <th>Created</th>
                          <th>Last used</th>
                          <th>Current</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => (
                          <tr key={s.familyId}>
                            <td>{s.label || s.familyId}</td>
                            <td>{formatDate(s.createdAt)}</td>
                            <td>{formatDate(s.lastUsedAt)}</td>
                            <td>{s.current ? 'Yes' : 'No'}</td>
                            <td>
                              {!s.current ? (
                                <Button
                                  variant="danger"
                                  type="button"
                                  loading={sessionBusyId === s.familyId}
                                  onClick={() => void revoke(s.familyId)}
                                >
                                  Revoke
                                </Button>
                              ) : (
                                <span className="profile__hint">This device</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
