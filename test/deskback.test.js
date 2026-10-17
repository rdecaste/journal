import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskArrival, withDeskBack, ROYOS_URL } from '../src/deskback.js';

const page = () => new Response('<html><body><p>Quest log</p></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const req = (path, cookie) => new Request('https://admindashboard.quest-engine.workers.dev' + path, { headers: cookie ? { Cookie: cookie } : {} });

test('from=royos: back to the same page without it, desk cookie set', () => {
  const r = deskArrival(req('/journal?desk=1&from=royos'));
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('Location'), '/journal?desk=1');
  assert.match(r.headers.get('Set-Cookie'), /^royos_back=1; Path=\/;/);
  assert.equal(deskArrival(req('/journal?desk=1')), null);
});

test('the back button shows only with the desk cookie, never on the login page', async () => {
  const shown = await (await withDeskBack(req('/', 'rq_session=x; royos_back=1'), page())).text();
  assert.ok(shown.includes(`href="${ROYOS_URL}"`));
  assert.ok(shown.indexOf('Back to Roy OS') < shown.indexOf('</body>'));
  assert.ok(!shown.includes('<script'));
  assert.ok(!(await (await withDeskBack(req('/'), page())).text()).includes('Back to Roy OS'));
  assert.ok(!(await (await withDeskBack(req('/login', 'royos_back=1'), page())).text()).includes('Back to Roy OS'));
});
