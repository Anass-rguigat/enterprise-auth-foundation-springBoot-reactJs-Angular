import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../core/auth/AuthContext'
import type { MfaEnrollmentStart, MfaStatus } from '../../core/api/page.types'
import {
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  useToast,
} from '../../shared/ui'
import { mfaApi } from './mfa.api'
import '../feature-pages.css'

export function MfaSettingsPage() {
  const auth = useAuth()
  const toast = useToast()

  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [enrollment, setEnrollment] = useState<MfaEnrollmentStart | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [confirmCode, setConfirmCode] = useState('')
  const [regenPassword, setRegenPassword] = useState('')
  const [regenCode, setRegenCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await mfaApi.status()
      setStatus(next)
      if (!next.enrollmentPending) {
        setEnrollment(null)
      }
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load MFA status'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  async function startEnroll() {
    setBusy(true)
    try {
      setEnrollment(await mfaApi.enroll())
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Could not start enrollment'))
    } finally {
      setBusy(false)
    }
  }

  async function cancelEnroll() {
    setBusy(true)
    try {
      await mfaApi.cancelEnroll()
      setEnrollment(null)
      toast.success('Enrollment cancelled')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Cancel failed'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnroll() {
    setBusy(true)
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
      setBusy(false)
    }
  }

  async function regenerate() {
    setBusy(true)
    try {
      const result = await mfaApi.regenerateRecovery(regenPassword, regenCode.trim())
      setRecoveryCodes(result.recoveryCodes)
      setRegenPassword('')
      setRegenCode('')
      toast.success('Recovery codes regenerated')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Regenerate failed'))
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      await mfaApi.disable(disablePassword, disableCode.trim())
      setDisablePassword('')
      setDisableCode('')
      setRecoveryCodes([])
      toast.success('MFA disabled')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Disable failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="MFA settings"
        subtitle="Self-service MFA — any signed-in user (not gated by MFA_MANAGE)."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Failed to load MFA status" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : status ? (
        <section className="fp-mfa">
          <p>
            Status: <strong>{status.enabled ? 'Enabled' : 'Disabled'}</strong>
            {status.enrollmentPending ? ' · enrollment pending' : ''}
            {status.enabled ? ` · ${status.unusedRecoveryCodes} recovery codes left` : ''}
          </p>

          {!status.enabled && !enrollment ? (
            <Button type="button" loading={busy} onClick={() => void startEnroll()}>
              Start enrollment
            </Button>
          ) : null}

          {enrollment ? (
            <div className="fp-dialog-form">
              <p className="fp-muted">
                Add this secret to your authenticator app, then confirm with a TOTP code.
              </p>
              <p>
                <strong>Secret:</strong> <code>{enrollment.secretBase32}</code>
              </p>
              <p className="uri">
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
              <div className="fp-row">
                <Button type="button" loading={busy} onClick={() => void confirmEnroll()}>
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  loading={busy}
                  onClick={() => void cancelEnroll()}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {recoveryCodes.length ? (
            <div>
              <h2>Recovery codes (store securely — shown once)</h2>
              <ul>
                {recoveryCodes.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status.enabled ? (
            <div className="fp-dialog-form">
              <h2>Regenerate recovery codes</h2>
              <Field label="Password" htmlFor="regen-pw">
                <Input
                  id="regen-pw"
                  type="password"
                  name="regenPw"
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                />
              </Field>
              <Field label="Current TOTP / recovery code" htmlFor="regen-code">
                <Input
                  id="regen-code"
                  name="regenCode"
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value)}
                />
              </Field>
              <Button type="button" loading={busy} onClick={() => void regenerate()}>
                Regenerate
              </Button>

              <h2>Disable MFA</h2>
              <Field label="Password" htmlFor="dis-pw">
                <Input
                  id="dis-pw"
                  type="password"
                  name="disPw"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </Field>
              <Field label="Current TOTP / recovery code" htmlFor="dis-code">
                <Input
                  id="dis-code"
                  name="disCode"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                />
              </Field>
              <Button variant="danger" type="button" loading={busy} onClick={() => void disable()}>
                Disable MFA
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
