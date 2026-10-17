// ---- Back to Roy OS
// Roy OS's menu bar opens the Quest log, Journal, Fitness and Admin pages in
// the same tab with `?from=royos` (Roy, 17 Oct 2026: "when I navigate to quest
// log page, i can navigate back"). The Worker drops the parameter, keeps a
// browser-session cookie (`royos_back`, its own, separate from the login
// cookie) and, while it is there, every page gets a "Back to Roy OS" button
// that returns to the board. No script: the Quest log page has none on purpose.

export const ROYOS_URL = 'https://royos.quest-engine.workers.dev/';
export const DESK_COOKIE = 'royos_back';

export const DESK_BACK = `<a class="royos-back" href="${ROYOS_URL}">‹ Back to Roy OS</a>
<style>.royos-back{position:fixed;left:16px;bottom:16px;z-index:50;display:inline-flex;align-items:center;padding:10px 16px;border-radius:999px;background:rgba(20,22,28,.88);color:#fff;font:600 15px/1 system-ui,-apple-system,sans-serif;text-decoration:none;border:1px solid rgba(255,255,255,.22);box-shadow:0 6px 20px rgba(0,0,0,.3)}.royos-back:hover{background:rgba(40,44,54,.95)}@media print{.royos-back{display:none}}</style>`;

const hasCookie = request => (request.headers.get('Cookie') || '').split(';').some(c => c.trim() === `${DESK_COOKIE}=1`);

// GET …?from=royos: the same page without the parameter, remembering the desk.
export function deskArrival(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.searchParams.get('from') !== 'royos') return null;
  url.searchParams.delete('from');
  return new Response(null, { status: 303, headers: {
    Location: url.pathname + url.search,
    'Set-Cookie': `${DESK_COOKIE}=1; Path=/; Secure; HttpOnly; SameSite=Lax`
  } });
}

// Adds the button to a page (never the login page) when the desk cookie is set.
export async function withDeskBack(request, response) {
  const { pathname } = new URL(request.url);
  const type = response.headers.get('Content-Type') || '';
  if (request.method !== 'GET' || pathname === '/login' || response.status !== 200 || !type.startsWith('text/html') || !hasCookie(request)) return response;
  const html = await response.text();
  const at = html.lastIndexOf('</body>');
  const body = at < 0 ? html + DESK_BACK : html.slice(0, at) + DESK_BACK + html.slice(at);
  return new Response(body, { status: response.status, headers: response.headers });
}
