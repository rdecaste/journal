// Notion pages in the shape the API returns them.
const rich = s => [{ type: 'text', text: { content: s }, plain_text: s }];
export const P = {
  title: s => ({ type: 'title', title: rich(s) }),
  text: s => ({ type: 'rich_text', rich_text: s ? rich(s) : [] }),
  num: n => ({ type: 'number', number: n === undefined ? null : n }),
  select: s => ({ type: 'select', select: s ? { name: s } : null }),
  date: s => ({ type: 'date', date: s ? { start: s } : null }),
  check: b => ({ type: 'checkbox', checkbox: !!b }),
  rel: (...ids) => ({ type: 'relation', relation: ids.map(id => ({ id })) })
};

export const page = (id, properties, extra = {}) => ({
  object: 'page', id, in_trash: false, archived: false,
  created_time: '2026-09-27T08:00:00.000Z', last_edited_time: '2026-09-27T08:00:00.000Z',
  properties, ...extra
});

// Turns a create-page body (write format) into the page Notion would return.
export function created(id, body, at = '2026-09-27T10:00:00.000Z') {
  const properties = {};
  for (const [name, value] of Object.entries(body.properties)) {
    if (value.title) properties[name] = { type: 'title', title: value.title.map(t => ({ ...t, plain_text: t.text.content })) };
    else if (value.rich_text) properties[name] = { type: 'rich_text', rich_text: value.rich_text.map(t => ({ ...t, plain_text: t.text.content })) };
    else properties[name] = value;
  }
  return page(id, properties, { created_time: at, last_edited_time: at });
}

// Deterministic crypto.getRandomValues: returns the given fractions in turn.
export function withRandom(fractions, fn) {
  const original = globalThis.crypto.getRandomValues;
  let i = 0;
  globalThis.crypto.getRandomValues = arr => { arr[0] = Math.floor(fractions[i++ % fractions.length] * 4294967296); return arr; };
  try { return fn(); } finally { globalThis.crypto.getRandomValues = original; }
}
