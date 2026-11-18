import { useState, type FormEvent } from 'react'
import { useAuth } from '../../core/auth/AuthContext'
import { Button, Field, Input, PageHeader, useToast } from '../../shared/ui'
import './auth-pages.css'

export function EmailChangePage() {
  const auth = useAuth()
  const toast = useToast()
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [emailError, setEmailError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setEmailError(newEmail.trim().includes('@') ? '' : 'Enter a valid email')
    setFormError('')
    if (!newEmail.trim().includes('@')) return

    setLoading(true)
    try {
      await auth.beginEmailChange(newEmail.trim())
      toast.success('Check the new inbox to verify the address.')
      setNewEmail('')
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not start email change'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Change email"
        subtitle="Sends a verification message to the new address. Available to any signed-in user."
      />
      <form className="email-change-form" onSubmit={submit} noValidate>
        <Field label="New email" htmlFor="email-new" error={emailError}>
          <Input
            id="email-new"
            type="email"
            name="newEmail"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            invalid={!!emailError}
          />
        </Field>
        {formError ? (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" loading={loading}>
          Request change
        </Button>
      </form>
    </>
  )
}
