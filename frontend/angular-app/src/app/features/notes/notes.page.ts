import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService } from '../../core/permissions/permission.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { DemoNote } from '../../core/api/page.types';
import { NotesApi } from './notes.api';
import { UiPageHeader } from '../../shared/ui/page-header/ui-page-header';
import { UiButton } from '../../shared/ui/button/ui-button';
import { UiField } from '../../shared/ui/field/ui-field';
import { UiInput } from '../../shared/ui/input/ui-input';
import { UiLoadingState } from '../../shared/ui/loading-state/ui-loading-state';
import { UiErrorState } from '../../shared/ui/error-state/ui-error-state';
import { UiEmptyState } from '../../shared/ui/empty-state/ui-empty-state';
import { UiDialog } from '../../shared/ui/dialog/ui-dialog';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [
    FormsModule,
    UiPageHeader,
    UiButton,
    UiField,
    UiInput,
    UiLoadingState,
    UiErrorState,
    UiEmptyState,
    UiDialog,
  ],
  template: `
    <ui-page-header
      title="Demo notes"
      subtitle="Owner-scoped business module sample gated by NOTE_*."
    >
      @if (perms.has('NOTE_CREATE')) {
        <ui-button type="button" (click)="openCreate()">New note</ui-button>
      }
    </ui-page-header>

    @if (loading()) {
      <ui-loading-state />
    } @else if (error()) {
      <ui-error-state title="Failed to load notes" [message]="error()!">
        <ui-button variant="secondary" type="button" (click)="reload()">Retry</ui-button>
      </ui-error-state>
    } @else if (!notes().length) {
      <ui-empty-state title="No notes yet" message="Create a note to exercise NOTE_CREATE." />
    } @else {
      <div class="fp-notes">
        @for (n of notes(); track n.id) {
          <article class="fp-note">
            <h2>{{ n.title }}</h2>
            <p>{{ n.body || '—' }}</p>
            <div class="fp-row">
              @if (perms.has('NOTE_UPDATE')) {
                <ui-button variant="secondary" type="button" (click)="openEdit(n)">Edit</ui-button>
              }
              @if (perms.has('NOTE_DELETE')) {
                <ui-button variant="danger" type="button" (click)="pendingDelete.set(n)">Delete</ui-button>
              }
            </div>
          </article>
        }
      </div>
    }

    <ui-dialog
      [open]="editorOpen()"
      [title]="editingId() ? 'Edit note' : 'New note'"
      confirmLabel="Save"
      [confirmLoading]="busy()"
      (confirm)="save()"
      (cancel)="editorOpen.set(false)"
    >
      <div class="fp-dialog-form">
        <ui-field label="Title" forId="note-title">
          <ui-input inputId="note-title" name="title" [(ngModel)]="title" />
        </ui-field>
        <ui-field label="Body" forId="note-body">
          <ui-input inputId="note-body" name="body" [(ngModel)]="body" />
        </ui-field>
        @if (formError()) {
          <p class="fp-err">{{ formError() }}</p>
        }
      </div>
    </ui-dialog>

    <ui-dialog
      [open]="!!pendingDelete()"
      title="Delete note?"
      confirmLabel="Delete"
      [danger]="true"
      [confirmLoading]="busy()"
      (confirm)="confirmDelete()"
      (cancel)="pendingDelete.set(null)"
    >
      This permanently deletes the note.
    </ui-dialog>
  `,

})
export class NotesPage implements OnInit {
  private readonly api = inject(NotesApi);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  readonly perms = inject(PermissionService);

  readonly notes = signal<DemoNote[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pendingDelete = signal<DemoNote | null>(null);
  readonly busy = signal(false);
  readonly formError = signal('');

  title = '';
  body = '';

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.notes.set(await this.api.list());
    } catch (err) {
      this.error.set(this.auth.problemMessage(err, 'Failed to load notes'));
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.title = '';
    this.body = '';
    this.formError.set('');
    this.editorOpen.set(true);
  }

  openEdit(note: DemoNote): void {
    this.editingId.set(note.id);
    this.title = note.title;
    this.body = note.body ?? '';
    this.formError.set('');
    this.editorOpen.set(true);
  }

  async save(): Promise<void> {
    if (!this.title.trim()) {
      this.formError.set('Title is required');
      return;
    }
    this.busy.set(true);
    this.formError.set('');
    try {
      const id = this.editingId();
      if (id) {
        await this.api.update(id, this.title.trim(), this.body);
        this.toasts.success('Note updated');
      } else {
        await this.api.create(this.title.trim(), this.body);
        this.toasts.success('Note created');
      }
      this.editorOpen.set(false);
      await this.reload();
    } catch (err) {
      this.formError.set(this.auth.problemMessage(err, 'Save failed'));
    } finally {
      this.busy.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const note = this.pendingDelete();
    if (!note) {
      return;
    }
    this.busy.set(true);
    try {
      await this.api.delete(note.id);
      this.toasts.success('Note deleted');
      this.pendingDelete.set(null);
      await this.reload();
    } catch (err) {
      this.toasts.danger(this.auth.problemMessage(err, 'Delete failed'));
    } finally {
      this.busy.set(false);
    }
  }
}
