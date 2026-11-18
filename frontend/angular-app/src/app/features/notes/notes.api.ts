import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { DemoNote } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class NotesApi {
  private readonly http = inject(HttpClient);

  list(): Promise<DemoNote[]> {
    return firstValueFrom(this.http.get<DemoNote[]>(apiUrl('/demo/notes')));
  }

  create(title: string, body: string): Promise<DemoNote> {
    return firstValueFrom(this.http.post<DemoNote>(apiUrl('/demo/notes'), { title, body }));
  }

  update(id: string, title: string, body: string): Promise<DemoNote> {
    return firstValueFrom(this.http.put<DemoNote>(apiUrl(`/demo/notes/${id}`), { title, body }));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/demo/notes/${id}`)));
  }
}
