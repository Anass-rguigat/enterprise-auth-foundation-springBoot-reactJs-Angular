import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input } from '../../shared/ui'
import './auth-pages.css'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setEmailError(email.trim() ? '' : 'Email is required')
    setPasswordError(password ? '' : 'Password is required')
    setFormError('')
    if (!email.trim() || !password) return

    setLoading(true)
    try {
      const outcome = await auth.login(email.trim(), password)
      if (outcome === 'mfaRequired') {
        await navigate('/mfa')
        return
      }
      if (outcome === 'mustChangePassword') {
        await navigate('/change-password')
        return
      }
      await navigate('/dashboard')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Cookie session against the Spring Boot API. JWTs stay HttpOnly."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="login-email" error={emailError}>
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!emailError}
          />
        </Field>
        <Field label="Password" htmlFor="login-password" error={passwordError}>
          <Input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
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
        <Button type="submit" variant="primary" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </AuthCard>
  )
}
