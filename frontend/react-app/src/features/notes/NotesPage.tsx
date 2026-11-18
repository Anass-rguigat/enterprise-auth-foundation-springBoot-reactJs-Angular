import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { DemoNote } from '../../core/api/page.types'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  useToast,
} from '../../shared/ui'
import { notesApi } from './notes.api'
import '../feature-pages.css'

export function NotesPage() {
  const auth = useAuth()
  const perms = usePermissions()
  const toast = useToast()

  const [notes, setNotes] = useState<DemoNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DemoNote | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNotes(await notesApi.list())
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load notes'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  function openCreate() {
    setEditingId(null)
    setTitle('')
    setBody('')
    setFormError('')
    setEditorOpen(true)
  }

  function openEdit(note: DemoNote) {
    setEditingId(note.id)
    setTitle(note.title)
    setBody(note.body ?? '')
    setFormError('')
    setEditorOpen(true)
  }

  async function save() {
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      if (editingId) {
        await notesApi.update(editingId, title.trim(), body)
        toast.success('Note updated')
      } else {
        await notesApi.create(title.trim(), body)
        toast.success('Note created')
      }
      setEditorOpen(false)
      await reload()
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Save failed'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await notesApi.delete(pendingDelete.id)
      toast.success('Note deleted')
      setPendingDelete(null)
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Delete failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Demo notes" subtitle="Owner-scoped business module sample gated by NOTE_*.">
        {perms.has('NOTE_CREATE') ? (
          <Button type="button" onClick={openCreate}>
            New note
          </Button>
        ) : null}
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Failed to load notes" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : !notes.length ? (
        <EmptyState title="No notes yet" message="Create a note to exercise NOTE_CREATE." />
      ) : (
        <div className="fp-notes">
          {notes.map((n) => (
            <article key={n.id} className="fp-note">
              <h2>{n.title}</h2>
              <p>{n.body || '—'}</p>
              <div className="fp-row">
                {perms.has('NOTE_UPDATE') ? (
                  <Button variant="secondary" type="button" onClick={() => openEdit(n)}>
                    Edit
                  </Button>
                ) : null}
                {perms.has('NOTE_DELETE') ? (
                  <Button variant="danger" type="button" onClick={() => setPendingDelete(n)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={editorOpen}
        title={editingId ? 'Edit note' : 'New note'}
        confirmLabel="Save"
        confirmLoading={busy}
        onConfirm={() => void save()}
        onCancel={() => setEditorOpen(false)}
      >
        <div className="fp-dialog-form">
          <Field label="Title" htmlFor="note-title">
            <Input
              id="note-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Body" htmlFor="note-body">
            <Input id="note-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          {formError ? <p className="fp-err">{formError}</p> : null}
        </div>
      </Dialog>

      <Dialog
        open={!!pendingDelete}
        title="Delete note?"
        confirmLabel="Delete"
        danger
        confirmLoading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        This permanently deletes the note.
      </Dialog>
    </>
  )
}
