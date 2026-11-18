import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input } from '../../shared/ui'
import './auth-pages.css'

export function MfaChallengePage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [codeError, setCodeError] = useState('')

  async function run(action: () => Promise<'session' | 'mustChangePassword'>) {
    setCodeError(code.trim() ? '' : 'Code is required')
    setFormError('')
    if (!code.trim()) return

    setLoading(true)
    try {
      const gate = await action()
      if (gate === 'mustChangePassword') {
        await navigate('/change-password')
        return
      }
      await navigate('/dashboard')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Invalid verification code'))
    } finally {
      setLoading(false)
    }
  }

  function submitTotp(event: FormEvent) {
    event.preventDefault()
    void run(() => auth.verifyMfa(code.trim()))
  }

  return (
    <AuthCard
      title="Multi-factor authentication"
      subtitle="Enter your authenticator code or a recovery code."
    >
      <form className="auth-form" onSubmit={submitTotp} noValidate>
        <Field label="Authenticator code" htmlFor="mfa-code" error={codeError}>
          <Input
            id="mfa-code"
            name="code"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            invalid={!!codeError}
          />
        </Field>
        {formError ? (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={loading}>
          Verify
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={() => void run(() => auth.recoverMfa(code.trim()))}
        >
          Use recovery code
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  )
}
