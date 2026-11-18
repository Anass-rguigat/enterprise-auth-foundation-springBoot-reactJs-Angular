import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input, useToast } from '../../shared/ui'
import './auth-pages.css'

export function ResetPasswordPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(password.length >= 8 ? '' : 'Use at least 8 characters')
    setFormError(token.trim() ? '' : 'Reset token is required')
    if (password.length < 8 || !token.trim()) return

    setLoading(true)
    try {
      await auth.resetPassword(token.trim(), password)
      toast.success('Password updated. Sign in with your new password.')
      await navigate('/login')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not reset password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Reset password" subtitle="Choose a new password using the link from your email.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Reset token" htmlFor="reset-token" hint="Filled from the email link when present.">
          <Input
            id="reset-token"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <Field label="New password" htmlFor="reset-password" error={passwordError}>
          <Input
            id="reset-password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!passwordError}
          />
        </Field>
        {formError ? (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={loading}>
          Update password
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  )
}
