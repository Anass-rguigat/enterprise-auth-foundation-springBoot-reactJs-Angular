import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import type { Role } from '../../core/api/page.types'
import {
  Button,
  Checkbox,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  useToast,
} from '../../shared/ui'
import { rolesApi } from '../roles/roles.api'
import { usersApi } from './users.api'
import '../feature-pages.css'
import './users.css'

export function UserCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [roles, setRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [organization, setOrganization] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [timezone, setTimezone] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    setRolesLoading(true)
    setRolesError(null)
    void rolesApi
      .list()
      .then((list) => setRoles(list.filter((r) => r.code !== 'SUPER_ADMIN')))
      .catch((err) => setRolesError(auth.problemMessage(err, 'Failed to load roles')))
      .finally(() => setRolesLoading(false))
  }, [auth])

  function toggleRole(code: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setFormError('Email, first name, and last name are required')
      return
    }
    setSaving(true)
    try {
      const created = await usersApi.create({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        department: department.trim() || undefined,
        organization: organization.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        preferredLanguage: preferredLanguage.trim() || undefined,
        timezone: timezone.trim() || undefined,
        bio: bio.trim() || undefined,
        roleCodes: [...selectedRoles],
      })
      toast.success('User created — invitation email sent')
      void navigate(`/users/${created.id}`)
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Create failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to="/users">
          ← Users
        </Link>
      </p>
      <PageHeader
        title="Create user"
        subtitle="We always send an invite. They verify email and choose their own password."
      />

      {rolesLoading ? <LoadingState /> : null}
      {rolesError ? <ErrorState title="Could not load roles" message={rolesError} /> : null}

      <form onSubmit={submit} noValidate>
        <section className="admin-card">
          <div className="admin-card__head">
            <p className="admin-card__eyebrow">Invite</p>
            <h2 className="admin-card__title">Account &amp; profile</h2>
            <p className="admin-card__desc">
              No admin password is set. The invite link activates the account.
            </p>
          </div>
          <div className="admin-card__body">
            <div className="admin-grid">
              <Field label="Email" htmlFor="uc-email">
                <Input
                  id="uc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Phone" htmlFor="uc-phone">
                <Input id="uc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="First name" htmlFor="uc-first">
                <Input
                  id="uc-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Last name" htmlFor="uc-last">
                <Input
                  id="uc-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Job title" htmlFor="uc-job">
                <Input id="uc-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </Field>
              <Field label="Department" htmlFor="uc-dept">
                <Input
                  id="uc-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </Field>
              <Field label="Organization" htmlFor="uc-org">
                <Input
                  id="uc-org"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </Field>
              <Field label="City" htmlFor="uc-city">
                <Input id="uc-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="Country" htmlFor="uc-country">
                <Input id="uc-country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </Field>
              <Field label="Language" htmlFor="uc-lang">
                <Input
                  id="uc-lang"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                />
              </Field>
              <Field label="Timezone" htmlFor="uc-tz">
                <Input id="uc-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </Field>
              <div className="admin-grid--full">
                <Field label="About" htmlFor="uc-bio">
                  <textarea
                    id="uc-bio"
                    className="fp-textarea"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <p className="admin-card__eyebrow">Authorization</p>
            <h2 className="admin-card__title">Assign roles</h2>
            <p className="admin-card__desc">
              Optional. You can also assign roles later from the edit screen.
            </p>
          </div>
          <div className="admin-card__body">
            <div className="users-role-grid">
              {roles.map((role) => (
                <div key={role.code} className="users-role-chip">
                  <Checkbox
                    id={`uc-role-${role.code}`}
                    checked={selectedRoles.has(role.code)}
                    onChange={() => toggleRole(role.code)}
                  >
                    <strong>{role.name}</strong>
                    <span>{role.code}</span>
                  </Checkbox>
                </div>
              ))}
            </div>
            {formError ? (
              <p className="fp-err" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="fp-row">
              <Button type="submit" loading={saving}>
                Create &amp; send invite
              </Button>
              <Link to="/users">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}
