// Where a moved area's tables live (docs/d1-migration.md): in Notion until
// the area is switched, then in D1. HEALTH_STORE ("notion" or "d1") picks it
// for step 1's tables. Both stores answer the same calls with pages in
// Notion's shape, so the code and the ported rules reading them don't change:
//   query(table, body)            the first page_size rows (100)
//   queryAll(table, body)         every row
//   get(table, id)
//   create(table, properties)     properties in Notion's write format
//   update(table, id, properties, columns)   `columns`: plain D1 columns
//                                 (E-bike €, a Notion formula before)
// In D1, `body` is translated to SQL for the filters this code uses: and/or;
// date equals, on_or_after, on_or_before, before, after (a date-only value is
// compared with the row's own local date, as Notion does); title, rich_text,
// select and url equals; number and any property is_empty / is_not_empty;
// checkbox equals; relation contains. Anything else throws, so an untranslated
// filter can never quietly return the wrong rows.
// A copy of the Quest Engine's src/store.js (rdecaste/quest-engine), with
// this Worker's Notion client; keep the two the same apart from that. The
// tables (src/areas.js) are a copy too.
import { TABLES } from './areas.js';

const quote = name => '"' + String(name).replace(/"/g, '""') + '"';

function tableOf(name) {
  const t = TABLES[name];
  if (!t) throw new Error(`No table "${name}"`);
  return t;
}

const typeOf = (t, prop) => (t.types && t.types[prop]) || 'number';
const columnOf = (t, prop) => {
  for (const [column, spec] of Object.entries(t.columns)) if ((typeof spec === 'string' ? spec : spec.prop) === prop) return column;
  throw new Error(`${t.table} has no column for "${prop}"`);
};

// ---- Pages from rows, rows from properties ----

const text = s => (s ? [{ type: 'text', text: { content: s, link: null }, plain_text: s, href: null }] : []);

function propertyOf(type, v) {
  switch (type) {
    case 'title': return { type, title: text(v) };
    case 'rich_text': return { type, rich_text: text(v) };
    case 'select': return { type, select: v ? { name: v } : null };
    case 'date': return { type, date: v ? { start: v, end: null, time_zone: null } : null };
    case 'checkbox': return { type, checkbox: !!v };
    case 'url': return { type, url: v || null };
    case 'relation': return { type, relation: (v ? JSON.parse(v) : []).map(id => ({ id })), has_more: false };
    case 'formula': return { type, formula: { type: 'number', number: v ?? null } };
    default: return { type: 'number', number: v ?? null };
  }
}

// A D1 row as the page Notion would return.
export function pageFromRow(t, row) {
  const properties = {};
  for (const [column, spec] of Object.entries(t.columns)) {
    const prop = typeof spec === 'string' ? spec : spec.prop;
    properties[prop] = propertyOf(typeOf(t, prop), row[column]);
  }
  return {
    object: 'page', id: row.id, created_time: row.created_time, last_edited_time: row.updated_at || row.notion_edited_time,
    in_trash: false, archived: false, url: null, parent: { type: 'data_source_id', data_source_id: t.dataSource }, properties
  };
}

// A date as Notion stores it: a plain date stays as it is; a moment keeps the
// offset it was written with, as `YYYY-MM-DDTHH:MM:SS.sss±HH:MM` (Z becomes
// +00:00), so rows written to D1 read exactly like the ones copied from Notion.
export function notionDate(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2})(?::(\d{2}))?(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m) throw new Error(`Not a date: ${v}`);
  if (!m[2]) return m[1];
  const zone = !m[5] || m[5] === 'Z' ? '+00:00' : m[5].includes(':') ? m[5] : m[5].slice(0, 3) + ':' + m[5].slice(3);
  return `${m[1]}T${m[2]}:${m[3] || '00'}.${(m[4] || '').padEnd(3, '0').slice(0, 3)}${zone}`;
}

// Properties in Notion's write format → columns. An unknown property throws.
export function rowFromProperties(t, properties) {
  const row = {};
  const plain = runs => (runs || []).map(r => r.plain_text ?? (r.text && r.text.content) ?? '').join('') || null;
  for (const [prop, value] of Object.entries(properties || {})) {
    const column = columnOf(t, prop);
    const type = typeOf(t, prop);
    if (value === undefined) continue;
    if (type === 'title') row[column] = plain(value.title);
    else if (type === 'rich_text') row[column] = plain(value.rich_text);
    else if (type === 'select') row[column] = (value.select && value.select.name) || null;
    else if (type === 'date') row[column] = notionDate(value.date && value.date.start);
    else if (type === 'checkbox') row[column] = value.checkbox ? 1 : 0;
    else if (type === 'url') row[column] = value.url || null;
    else if (type === 'relation') row[column] = value.relation && value.relation.length ? JSON.stringify(value.relation.map(r => r.id)) : null;
    else if (type === 'formula') throw new Error(`${t.table}: "${prop}" was a Notion formula; set its column instead`);
    else row[column] = value.number ?? null;
  }
  return row;
}

// ---- Notion filters → SQL ----

const DATE_OPS = { equals: '=', on_or_after: '>=', on_or_before: '<=', after: '>', before: '<' };

function condition(t, f, params) {
  if (f.and) return '(' + (f.and.map(x => condition(t, x, params)).join(' AND ') || '1') + ')';
  if (f.or) return '(' + (f.or.map(x => condition(t, x, params)).join(' OR ') || '0') + ')';
  if (f.timestamp) throw new Error(`Unsupported filter on ${f.timestamp}`);
  const column = quote(columnOf(t, f.property));
  const kind = Object.keys(f).find(k => k !== 'property' && k !== 'type');
  const c = f[kind] || {};
  if (c.is_empty) return `(${column} IS NULL OR ${column} = '' OR ${column} = '[]')`;
  if (c.is_not_empty) return `(${column} IS NOT NULL AND ${column} != '' AND ${column} != '[]')`;
  if (kind === 'date') {
    const op = Object.keys(c).find(k => DATE_OPS[k]);
    if (!op) throw new Error(`Unsupported date filter ${JSON.stringify(c)}`);
    const v = String(c[op]);
    params.push(v);
    return v.length === 10 ? `substr(${column}, 1, 10) ${DATE_OPS[op]} ?` : `julianday(${column}) ${DATE_OPS[op]} julianday(?)`;
  }
  if (['title', 'rich_text', 'select', 'url', 'status'].includes(kind) && 'equals' in c) { params.push(c.equals); return `${column} = ?`; }
  if (kind === 'checkbox' && 'equals' in c) { params.push(c.equals ? 1 : 0); return `${column} = ?`; }
  if (kind === 'number' && 'equals' in c) { params.push(c.equals); return `${column} = ?`; }
  if (kind === 'relation' && c.contains) {
    params.push(String(c.contains).replace(/-/g, ''));
    return `EXISTS (SELECT 1 FROM json_each(${column}) WHERE replace(json_each.value, '-', '') = ?)`;
  }
  throw new Error(`Unsupported filter ${JSON.stringify(f)}`);
}

function orderBy(t, sorts) {
  if (!sorts || !sorts.length) return 'created_time DESC';
  return sorts.map(s => {
    const dir = s.direction === 'descending' ? 'DESC' : 'ASC';
    if (s.timestamp) return `${s.timestamp === 'last_edited_time' ? 'coalesce(updated_at, notion_edited_time)' : 'created_time'} ${dir}`;
    const column = quote(columnOf(t, s.property));
    // Empty values last, as in Notion; dates by their moment (offsets differ).
    return typeOf(t, s.property) === 'date' ? `${column} IS NULL, julianday(${column}) ${dir}` : `${column} IS NULL, ${column} ${dir}`;
  }).join(', ');
}

export function selectSql(t, body = {}, limit = null) {
  const params = [];
  const where = body.filter ? condition(t, body.filter, params) : '1';
  let sql = `SELECT * FROM ${quote(t.table)} WHERE ${where} ORDER BY ${orderBy(t, body.sorts)}`;
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }
  return { sql, params };
}

// ---- The two stores ----

export function d1Store(db, now = () => new Date()) {
  const rows = async (name, body, limit) => {
    const t = tableOf(name);
    const { sql, params } = selectSql(t, body, limit);
    return ((await db.prepare(sql).bind(...params).all()).results || []).map(r => pageFromRow(t, r));
  };
  const get = async (name, id) => {
    const t = tableOf(name);
    const row = await db.prepare(`SELECT * FROM ${quote(t.table)} WHERE id = ?`).bind(id).first();
    return row ? pageFromRow(t, row) : null;
  };
  return {
    kind: 'd1',
    query: (name, body = {}) => rows(name, body, Math.min(body.page_size || 100, 100)),
    queryAll: (name, body = {}) => rows(name, body, null),
    get,
    async create(name, properties) {
      const t = tableOf(name);
      const at = now().toISOString();
      const row = { id: crypto.randomUUID(), created_time: at, updated_at: at, ...rowFromProperties(t, properties) };
      const cols = Object.keys(row);
      await db.prepare(`INSERT INTO ${quote(t.table)} (${cols.map(quote).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .bind(...cols.map(c => row[c] ?? null)).run();
      return get(name, row.id);
    },
    async update(name, id, properties, columns = {}) {
      const t = tableOf(name);
      for (const c of Object.keys(columns)) if (!(c in t.columns)) throw new Error(`${t.table} has no column "${c}"`);
      const row = { ...rowFromProperties(t, properties), ...columns, updated_at: now().toISOString() };
      const cols = Object.keys(row);
      const r = await db.prepare(`UPDATE ${quote(t.table)} SET ${cols.map(c => `${quote(c)} = ?`).join(', ')} WHERE id = ?`)
        .bind(...cols.map(c => row[c] ?? null), id).run();
      if (!r.meta || !r.meta.changes) throw new Error(`No ${name} row ${id}`);
      return get(name, id);
    }
  };
}

export function notionStore(notion) {
  const ds = name => tableOf(name).dataSource;
  return {
    kind: 'notion',
    query: (name, body = {}) => notion.query(ds(name), body).then(r => r.results || []),
    async queryAll(name, body = {}) {
      const pages = [];
      let cursor;
      do {
        const r = await notion.call('POST', `/data_sources/${ds(name)}/query`, { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
        pages.push(...(r.results || []));
        cursor = r.has_more ? r.next_cursor : null;
      } while (cursor);
      return pages;
    },
    get: (name, id) => notion.call('GET', `/pages/${id}`),
    create: (name, properties) => notion.call('POST', '/pages', { parent: { type: 'data_source_id', data_source_id: ds(name) }, properties }),
    // In Notion, E-bike € is still a formula: plain columns are D1's alone.
    update: (name, id, properties) => notion.call('PATCH', `/pages/${id}`, { properties })
  };
}

// The store for the health and work tables, by HEALTH_STORE (the same
// setting as the Quest Engine's).
export function healthStore(env, notion) {
  if (env.HEALTH_STORE === 'd1') {
    if (!env.DB) throw new Error('HEALTH_STORE is "d1" but the D1 database (DB) is not bound');
    return d1Store(env.DB);
  }
  return notionStore(notion);
}
