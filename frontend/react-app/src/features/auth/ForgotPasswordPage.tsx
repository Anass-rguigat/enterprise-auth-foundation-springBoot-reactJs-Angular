import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input, useToast } from '../../shared/ui'
import './auth-pages.css'

export function ForgotPasswordPage() {
  const auth = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailError, setEmailError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setEmailError(email.trim() ? '' : 'Email is required')
    setFormError('')
    if (!email.trim()) return

    setLoading(true)
    try {
      await auth.forgotPassword(email.trim())
      toast.success('If that email is registered, a reset link is on its way.')
      setEmail('')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not start password reset'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="If an account exists for that email, a reset link will be sent."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="forgot-email" error={emailError}>
          <Input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!emailError}
          />
        </Field>
        {formError ? (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  )
}
