// A small in-memory Notion for the journal page tests: blocks with children,
// pages with properties, and the calls src/notion.js makes (via fetch).
let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
export const run = t => ({ type: 'text', text: { content: t }, plain_text: t });
const withPlain = rt => (rt || []).map(r => ({ ...r, plain_text: r.plain_text ?? r.text?.content ?? '' }));

export class FakeNotion {
  constructor() { this.blocks = {}; this.kids = {}; this.pages = {}; this.calls = []; this.queries = {}; this.fail = null; }

  // add(parent, type, text, extra) → id; `extra` merges into the block's type object.
  add(parent, type, text = '', extra = {}) {
    const id = uuid();
    this.blocks[id] = { object: 'block', id, type, has_children: false, last_edited_time: '2026-09-30T08:00:00.000Z',
      parent: { type: 'block_id', block_id: parent }, [type]: { rich_text: text ? [run(text)] : [], ...extra } };
    (this.kids[parent] = this.kids[parent] || []).push(id);
    if (this.blocks[parent]) this.blocks[parent].has_children = true;
    return id;
  }
  page(id, properties = {}, extra = {}) { this.pages[id] = { object: 'page', id, properties, url: `https://www.notion.so/${id.replace(/-/g, '')}`, ...extra }; this.kids[id] = this.kids[id] || []; return id; }
  children(id) { return (this.kids[id] || []).map(k => this.blocks[k]); }
  text(id) { return this.blocks[id][this.blocks[id].type].rich_text.map(r => r.plain_text).join(''); }

  create(parent, child, after) {
    const { type } = child;
    const body = child[type] || {};
    const id = this.add(parent, type, '', { ...body, rich_text: withPlain(body.rich_text), children: undefined });
    delete this.blocks[id][type].children;
    const list = this.kids[parent];
    if (after) { list.pop(); list.splice(list.indexOf(after) + 1, 0, id); }
    for (const c of body.children || []) this.create(id, c);
    return this.blocks[id];
  }

  handle(method, path, body) {
    this.calls.push({ method, path, body });
    if (this.fail && this.fail(method, path, body)) return [403, { message: 'Insufficient permissions for this endpoint.' }];
    let m;
    if ((m = /^\/blocks\/([^/]+)\/children/.exec(path))) {
      const id = m[1];
      if (method === 'GET') return [200, { results: this.children(id), has_more: false }];
      if (!this.kids[id] && !this.blocks[id]) return [404, { message: 'Could not find block' }];
      let after = body.after;
      const results = body.children.map(c => { const b = this.create(id, c, after); after = b.id; return b; });
      return [200, { results }];
    }
    if ((m = /^\/blocks\/([^/]+)$/.exec(path))) {
      const b = this.blocks[m[1]];
      if (!b || b.in_trash) return [404, { message: 'Could not find block' }];
      if (method === 'DELETE') { b.in_trash = true; for (const list of Object.values(this.kids)) { const i = list.indexOf(b.id); if (i >= 0) list.splice(i, 1); } return [200, b]; }
      const next = body[b.type];
      b[b.type] = { ...b[b.type], ...next, ...(next.rich_text ? { rich_text: withPlain(next.rich_text) } : {}) };
      b.last_edited_time = '2026-09-30T12:00:00.000Z';
      return [200, b];
    }
    if ((m = /^\/pages\/([^/]+)$/.exec(path))) {
      const p = this.pages[m[1]];
      if (!p) return [404, { message: 'Could not find page' }];
      if (method === 'PATCH') Object.assign(p.properties, body.properties);
      return [200, p];
    }
    if ((m = /^\/data_sources\/([^/]+)\/query$/.exec(path))) {
      const f = this.queries[m[1]];
      return [200, { results: f ? f(body) : [], has_more: false }];
    }
    return [404, { message: 'no route ' + path }];
  }

  // Swaps global fetch for this fake while `fn` runs.
  async use(fn) {
    const original = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      const path = String(url).replace('https://api.notion.com/v1', '');
      const [status, data] = this.handle(init.method || 'GET', path, init.body ? JSON.parse(init.body) : undefined);
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    };
    try { return await fn(); } finally { globalThis.fetch = original; }
  }
}

// The day's journal as the template makes it (30 Sep 2026 layout).
export function journalFixture(fake, pageId, { reflection = '' } = {}) {
  fake.page(pageId, { Entry: { type: 'title', title: [run('30 September 2026')] }, Success: { type: 'checkbox', checkbox: false } });
  const ids = {};
  fake.add(pageId, 'heading_2', '☀️ MORNING');
  const cols = fake.add(pageId, 'column_list');
  const c1 = fake.add(cols, 'column'), c2 = fake.add(cols, 'column');
  const head = fake.add(c1, 'callout', 'Headspace box', { icon: { type: 'emoji', emoji: '🧠' } });
  fake.blocks[head].callout.rich_text = [];
  fake.add(head, 'heading_3', 'Headspace');
  ids.headspaceQ = fake.add(head, 'paragraph', 'What’s your take this morning on the quote?');
  ids.headspaceA = fake.add(head, 'paragraph', '');
  const fwd = fake.add(c1, 'callout', '', { icon: { type: 'emoji', emoji: '😄' } });
  fake.add(fwd, 'heading_3', 'Looking forward to');
  fake.add(fwd, 'paragraph', 'Who would you enjoy time with?');
  const focus = fake.add(c2, 'callout', '', { icon: { type: 'emoji', emoji: '🔥' } });
  ids.focus = focus;
  fake.add(focus, 'heading_3', 'Today’s focus');
  ids.must = fake.add(focus, 'paragraph', 'Must do');
  ids.mustTodo = fake.add(focus, 'to_do', '', { checked: false });
  ids.can = fake.add(focus, 'paragraph', 'Can do');
  ids.canTodo = fake.add(focus, 'to_do', 'Old can do', { checked: true });
  ids.cool = fake.add(focus, 'paragraph', 'Something cool');
  ids.coolTodo = fake.add(focus, 'to_do', '', { checked: false });
  fake.add(pageId, 'divider');
  fake.add(pageId, 'heading_2', '🌙 EVENING');
  ids.evening = fake.add(pageId, 'column_list');
  const e1 = fake.add(ids.evening, 'column'), e2 = fake.add(ids.evening, 'column');
  const refl = fake.add(e1, 'callout', '', { icon: { type: 'emoji', emoji: '🌙' } });
  fake.add(refl, 'heading_3', 'Reflection of the day');
  fake.add(refl, 'paragraph', 'What did you notice about your energy?');
  ids.reflectionA = fake.add(refl, 'paragraph', reflection);
  const tom = fake.add(e2, 'callout', '', { icon: { type: 'emoji', emoji: '➡️' } });
  fake.add(tom, 'heading_3', 'For tomorrow');
  fake.add(tom, 'paragraph', 'What would you like tomorrow to have room for?');
  ids.tomorrowA = fake.add(tom, 'paragraph', '');
  ids.divider = fake.add(pageId, 'divider');
  fake.add(pageId, 'heading_2', '⚔️ QUEST CHECK-IN');
  fake.add(pageId, 'heading_3', '🔥 MAIN QUEST');
  const mq = fake.add(pageId, 'callout', 'Break the Cycle', { icon: { type: 'emoji', emoji: '🔥' } });
  const mcols = fake.add(mq, 'column_list');
  const mc = fake.add(mcols, 'column');
  fake.add(mc, 'heading_3', '✅ Success');
  fake.add(mc, 'button');
  fake.add(pageId, 'heading_3', '🗺️ ACTIVE QUESTS');
  const qcols = fake.add(pageId, 'column_list');
  const q1 = fake.add(qcols, 'column'), q2 = fake.add(qcols, 'column');
  ids.shape = fake.add(q1, 'callout', 'Get Back in Shape', { icon: { type: 'emoji', emoji: '💪' } });
  ids.shapeNote = fake.add(ids.shape, 'paragraph', '');
  ids.yard = fake.add(q2, 'callout', 'Develop the Backyard', { icon: { type: 'emoji', emoji: '⚔️' } });
  ids.yardNote = fake.add(ids.yard, 'paragraph', 'Quote came in');
  fake.add(pageId, 'child_database');
  return ids;
}
