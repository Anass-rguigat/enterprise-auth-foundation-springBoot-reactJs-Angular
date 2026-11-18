import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { AuthCard, Button, Field, Input } from '../../shared/ui'
import './auth-pages.css'

export function VerifyEmailPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const autoTried = useRef(false)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    setFormError(token.trim() ? '' : 'Token is required')
    setSuccess(false)
    if (!token.trim()) return

    setLoading(true)
    try {
      await auth.verifyEmail(token.trim())
      setSuccess(true)
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not verify email'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoTried.current) return
    const q = params.get('token')
    if (!q) return
    autoTried.current = true
    void (async () => {
      setLoading(true)
      setFormError('')
      setSuccess(false)
      try {
        await auth.verifyEmail(q.trim())
        setSuccess(true)
      } catch (err) {
        setFormError(auth.problemMessage(err, 'Could not verify email'))
      } finally {
        setLoading(false)
      }
    })()
  }, [auth, params])

  return (
    <AuthCard
      title="Verify email"
      subtitle="Confirm your email address with the token from the message."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field label="Verification token" htmlFor="verify-token">
          <Input
            id="verify-token"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        {formError ? (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        {success ? (
          <p className="auth-form__ok" role="status">
            Email verified. You can sign in.
          </p>
        ) : null}
        <Button type="submit" loading={loading}>
          Verify
        </Button>
      </form>
      <p className="auth-form__links">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  )
}
