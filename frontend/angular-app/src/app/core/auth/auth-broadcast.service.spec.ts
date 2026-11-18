import { TestBed } from '@angular/core/testing';
import { AuthBroadcastService } from './auth-broadcast.service';
import { AuthBroadcastMessage } from './auth.models';

describe('AuthBroadcastService', () => {
  it('delivers same-origin messages to subscribers', async () => {
    TestBed.configureTestingModule({});
    const a = TestBed.inject(AuthBroadcastService);

    // Second instance shares the BroadcastChannel name
    const b = new AuthBroadcastService();

    const seen: AuthBroadcastMessage[] = [];
    const unsub = a.subscribe((msg) => seen.push(msg));

    b.publish({ type: 'refresh:start' });
    b.publish({ type: 'logout' });

    // BroadcastChannel is async in some environments
    await vi.waitFor(() => {
      expect(seen.map((m) => m.type)).toEqual(['refresh:start', 'logout']);
    });

    unsub();
    b.ngOnDestroy();
  });
});
