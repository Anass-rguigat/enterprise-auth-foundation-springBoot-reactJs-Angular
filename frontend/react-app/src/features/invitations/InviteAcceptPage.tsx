import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input, useToast } from '../../shared/ui'
import { invitationsApi } from './invitations.api'
import '../auth/auth-pages.css'

export function InviteAcceptPage() {
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
    setFormError(token.trim() ? '' : 'Invitation token is required')
    if (password.length < 8 || !token.trim()) return

    setLoading(true)
    try {
      await invitationsApi.accept(token.trim(), password)
      toast.success('Invitation accepted. Sign in with your new password.')
      await navigate('/login')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not accept invitation'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Accept invitation" subtitle="Set your password to activate the invited account.">
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Invitation token" htmlFor="inv-token">
          <Input id="inv-token" name="token" value={token} onChange={(e) => setToken(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="inv-password" error={passwordError}>
          <Input
            id="inv-password"
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
          Accept & activate
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/login">Sign in</Link>
      </p>
    </AuthCard>
  )
}
