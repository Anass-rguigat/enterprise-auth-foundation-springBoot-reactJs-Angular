import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input, useToast } from '../../shared/ui'
import './auth-pages.css'

export function ChangePasswordPage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const forced = auth.status === 'mustChangePassword'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [currentError, setCurrentError] = useState('')
  const [newError, setNewError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setCurrentError(currentPassword ? '' : 'Current password is required')
    setNewError(newPassword.length >= 8 ? '' : 'Use at least 8 characters')
    setFormError('')
    if (!currentPassword || newPassword.length < 8) return

    setLoading(true)
    try {
      await auth.changePassword(currentPassword, newPassword)
      toast.success('Password updated. Sign in again.')
      await navigate('/login')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not change password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title={forced ? 'Password change required' : 'Change password'}
      subtitle={
        forced
          ? 'You must set a new password before using the application. You will sign in again afterward.'
          : 'Updates your password, revokes all sessions, and requires a fresh sign-in.'
      }
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Current password" htmlFor="chg-current" error={currentError}>
          <Input
            id="chg-current"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            invalid={!!currentError}
          />
        </Field>
        <Field label="New password" htmlFor="chg-new" error={newError}>
          <Input
            id="chg-new"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            invalid={!!newError}
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
      {!forced ? (
        <p className="auth-form__links">
          <Link to="/dashboard">Cancel</Link>
        </p>
      ) : null}
    </AuthCard>
  )
}
