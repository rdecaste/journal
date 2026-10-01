// A copy of the Quest Engine's src/store.js (rdecaste/quest-engine), apart
// from choosing the store; the tables (src/areas.js) are a copy too. The
// tables are in D1 since 1 Oct 2026 (its docs/d1-migration.md). The store
// answers in Notion's shape, so the code reading pages didn't change
// (notionStore answers the same calls from Notion, for the Quest Engine's
// copy and check tools only):
//   query(table, body)            the first page_size rows (100)
//   queryAll(table, body)         every row
//   get(table, id)
//   create(table, properties, columns)   properties in Notion's write format
//   update(table, id, properties, columns)   `columns`: plain D1 columns
//                                 (E-bike €, a Notion formula before; a
//                                 table's `plain` columns, like the journal's answers)
//   remove(table, id)             to Notion's trash; in D1 the row is deleted
//                                 (the nightly backup and Time Travel keep it)
// In D1, `body` is translated to SQL for the filters this code uses: and/or;
// date equals, on_or_after, on_or_before, before, after (a date-only value is
// compared with the row's own local date, as Notion does); title, rich_text,
// select, status and url equals; title and rich_text contains; select and
// status does_not_equal;
// multi_select contains; number equals, does_not_equal, greater_than(_or_
// equal_to) and less_than(_or_equal_to); any property is_empty /
// is_not_empty; checkbox equals; relation contains.
// A table's `rollups` (Notion rollups the code reads) are rebuilt from the
// related table on every read. A table with `trash` keeps a page sent to the
// trash as a row marked in_trash: queries leave it out, get still finds it
// (as Notion does). Anything else throws, so an untranslated
// filter can never quietly return the wrong rows.
// The admin dashboard (rdecaste/journal) has a copy as src/healthstore.js,
// with its own Notion client; keep the two the same apart from that.
import { TABLES } from './areas.js';

const quote = name => '"' + String(name).replace(/"/g, '""') + '"';
// Ids are kept with dashes; Notion accepts (and the card sends) them without.
const dashed = id => (/^[0-9a-f]{32}$/i.test(String(id)) ? String(id).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') : id);

function tableOf(name) {
  const t = TABLES[name];
  if (!t) throw new Error(`No table "${name}"`);
  return t;
}

const typeOf = (t, prop) => (t.types && t.types[prop]) || 'number';
const specOf = spec => (typeof spec === 'string' ? { prop: spec } : spec);
const columnOf = (t, prop) => {
  for (const [column, spec] of Object.entries(t.columns)) if (specOf(spec).prop === prop) return column;
  throw new Error(`${t.table} has no column for "${prop}"`);
};

// ---- Pages from rows, rows from properties ----

const text = s => (s ? [{ type: 'text', text: { content: s, link: null }, plain_text: s, href: null }] : []);

function propertyOf(type, v) {
  switch (type) {
    case 'title': return { type, title: text(v) };
    case 'rich_text': return { type, rich_text: text(v) };
    case 'select': return { type, select: v ? { name: v } : null };
    case 'status': return { type, status: v ? { name: v } : null };
    case 'multi_select': return { type, multi_select: (v ? JSON.parse(v) : []).map(name => ({ name })) };
    case 'files': return { type, files: (v ? JSON.parse(v) : []).map(f => ({ name: f.name, type: 'external', external: { url: f.url } })) };
    case 'created_time': return { type, created_time: v || null };
    case 'people': return { type, people: (v ? JSON.parse(v) : []).map(id => ({ object: 'user', id })) };
    case 'unique_id': {
      const m = /^(?:(.*)-)?(\d+)$/.exec(String(v ?? ''));
      return { type, unique_id: { prefix: m && m[1] ? m[1] : null, number: m ? Number(m[2]) : null } };
    }
    case 'date': return { type, date: v ? { start: v, end: null, time_zone: null } : null };
    case 'checkbox': return { type, checkbox: !!v };
    case 'url': return { type, url: v || null };
    case 'relation': return { type, relation: (v ? JSON.parse(v) : []).map(id => ({ id })), has_more: false };
    case 'formula': return { type, formula: { type: 'number', number: v ?? null } };
    default: return { type: 'number', number: v ?? null };
  }
}

// A rollup as Notion shows one ("show original"): the related rows' values.
function rollupOf(r, json) {
  const values = json ? JSON.parse(json) : [];
  const item = v => (r.type === 'select' ? { type: 'select', select: v ? { name: v } : null } : { type: r.type, [r.type]: text(v) });
  return { type: 'rollup', rollup: { type: 'array', array: values.map(item), function: 'show_original' } };
}

// A D1 row as the page Notion would return.
export function pageFromRow(t, row) {
  const properties = {};
  const page = {};
  for (const [column, spec] of Object.entries(t.columns)) {
    const s = specOf(spec);
    if (s.page) page[s.page] = row[column] ? JSON.parse(row[column]) : null;
    else properties[s.prop] = propertyOf(typeOf(t, s.prop), row[column]);
  }
  for (const [prop, r] of Object.entries(t.rollups || {})) properties[prop] = rollupOf(r, row['rollup:' + prop]);
  return {
    object: 'page', id: row.id, created_time: row.created_time, last_edited_time: row.updated_at || row.notion_edited_time,
    in_trash: row.in_trash === 1, archived: false, url: null, ...page, parent: { type: 'data_source_id', data_source_id: t.dataSource }, properties
  };
}

// The columns a read selects: the row and its rollups.
function selected(t) {
  const rollups = Object.entries(t.rollups || {}).map(([prop, r]) =>
    `(SELECT json_group_array(r.${quote(r.column)}) FROM json_each(t.${quote(r.relation)}) AS je JOIN ${quote(r.table)} AS r ON r.id = je.value) AS ${quote('rollup:' + prop)}`);
  return ['t.*', ...rollups].join(', ');
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
    else if (type === 'status') row[column] = (value.status && value.status.name) || null;
    else if (type === 'multi_select') row[column] = value.multi_select && value.multi_select.length ? JSON.stringify(value.multi_select.map(o => o.name)) : null;
    else if (type === 'people') row[column] = value.people && value.people.length ? JSON.stringify(value.people.map(u => u.id)) : null;
    else if (type === 'files') row[column] = value.files && value.files.length ? JSON.stringify(value.files.map(f => ({ name: f.name, url: (f.external || f.file || {}).url }))) : null;
    else if (type === 'created_time' || type === 'unique_id') throw new Error(`${t.table}: "${prop}" is set when the row is made`);
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
  // Notion's contains ignores case.
  if (['title', 'rich_text'].includes(kind) && 'contains' in c) { params.push(String(c.contains).toLowerCase()); return `instr(lower(${column}), ?) > 0`; }
  // As in Notion, an empty value doesn't equal anything.
  if (['select', 'status'].includes(kind) && 'does_not_equal' in c) { params.push(c.does_not_equal); return `(${column} IS NULL OR ${column} != ?)`; }
  if (kind === 'multi_select' && c.contains) { params.push(c.contains); return `EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value = ?)`; }
  if (kind === 'checkbox' && 'equals' in c) { params.push(c.equals ? 1 : 0); return `${column} = ?`; }
  const NUMBER_OPS = { equals: '=', does_not_equal: '!=', greater_than: '>', less_than: '<', greater_than_or_equal_to: '>=', less_than_or_equal_to: '<=' };
  const numberOp = kind === 'number' && Object.keys(c).find(k => NUMBER_OPS[k]);
  if (numberOp) {
    params.push(c[numberOp]);
    // As in Notion, an empty number matches none of these but does_not_equal.
    return numberOp === 'does_not_equal' ? `(${column} IS NULL OR ${column} != ?)` : `${column} ${NUMBER_OPS[numberOp]} ?`;
  }
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
  const where = (body.filter ? condition(t, body.filter, params) : '1') + (t.trash ? ' AND in_trash IS NOT 1' : '');
  let sql = `SELECT ${selected(t)} FROM ${quote(t.table)} AS t WHERE ${where} ORDER BY ${orderBy(t, body.sorts)}`;
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
    const row = await db.prepare(`SELECT ${selected(t)} FROM ${quote(t.table)} AS t WHERE id = ?`).bind(dashed(id)).first();
    return row ? pageFromRow(t, row) : null;
  };
  return {
    kind: 'd1',
    db,
    query: (name, body = {}) => rows(name, body, Math.min(body.page_size || 100, 100)),
    queryAll: (name, body = {}) => rows(name, body, null),
    get,
    async create(name, properties, columns = {}) {
      const t = tableOf(name);
      for (const c of Object.keys(columns)) if (!(c in t.columns) && !(t.plain || []).includes(c)) throw new Error(`${t.table} has no column "${c}"`);
      const at = now().toISOString();
      const row = { id: crypto.randomUUID(), created_time: at, updated_at: at, ...rowFromProperties(t, properties), ...columns };
      const cols = Object.keys(row);
      await db.prepare(`INSERT INTO ${quote(t.table)} (${cols.map(quote).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .bind(...cols.map(c => row[c] ?? null)).run();
      return get(name, row.id);
    },
    async update(name, id, properties, columns = {}) {
      const t = tableOf(name);
      for (const c of Object.keys(columns)) if (!(c in t.columns) && !(t.plain || []).includes(c)) throw new Error(`${t.table} has no column "${c}"`);
      const row = { ...rowFromProperties(t, properties), ...columns, updated_at: now().toISOString() };
      const cols = Object.keys(row);
      const r = await db.prepare(`UPDATE ${quote(t.table)} SET ${cols.map(c => `${quote(c)} = ?`).join(', ')} WHERE id = ?`)
        .bind(...cols.map(c => row[c] ?? null), dashed(id)).run();
      if (!r.meta || !r.meta.changes) throw new Error(`No ${name} row ${id}`);
      return get(name, id);
    },
    async remove(name, id) {
      const t = tableOf(name);
      if (t.trash) {
        await db.prepare(`UPDATE ${quote(t.table)} SET in_trash = 1, updated_at = ? WHERE id = ?`).bind(now().toISOString(), dashed(id)).run();
        return get(name, id);
      }
      await db.prepare(`DELETE FROM ${quote(t.table)} WHERE id = ?`).bind(dashed(id)).run();
      return null;
    }
  };
}

export function notionStore(notion) {
  const ds = name => tableOf(name).dataSource;
  return {
    kind: 'notion',
    query: (name, body = {}) => notion.query(ds(name), body),
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
    get: (name, id) => notion.getPage(id),
    create: (name, properties) => notion.createPage({ parent: { type: 'data_source_id', data_source_id: ds(name) }, properties }),
    update: (name, id, properties) => notion.updatePage(id, { properties }),
    remove: (name, id) => notion.updatePage(id, { in_trash: true })
  };
}

// The store for the health and work tables and for the journal, to-dos and
// quests: D1 (the same database as the Quest Engine's).
function areaStore(env) {
  if (!(env && env.DB)) throw new Error('The D1 database (DB) is not bound');
  return d1Store(env.DB);
}
export const healthStore = env => areaStore(env);
export const journalStore = env => areaStore(env);
