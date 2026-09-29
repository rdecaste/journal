// A small Notion client with retries for rate limits: data source queries,
// plus reading a page's blocks and updating one block (the Quest log line).
const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';

export class Notion {
  constructor(token) {
    if (!token) throw new Error('NOTION_TOKEN is not set');
    this.token = token;
  }

  async call(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      if (!(response.status === 429 || response.status >= 500) || attempt >= 3) throw new Error(`Notion ${response.status}: ${data.message || 'request failed'}`);
      await new Promise(r => setTimeout(r, Number(response.headers.get('Retry-After')) * 1000 || 400 * 2 ** attempt));
    }
  }

  query(dataSourceId, body) { return this.call('POST', `/data_sources/${dataSourceId}/query`, body); }

  // A page's top-level blocks (first 100 are plenty for the Quest log).
  async children(blockId) { return (await this.call('GET', `/blocks/${blockId}/children?page_size=100`)).results || []; }

  updateBlock(blockId, body) { return this.call('PATCH', `/blocks/${blockId}`, body); }

  // Every page of a query (up to maxPages × 100 rows).
  async queryAll(dataSourceId, body, maxPages = 5) {
    const rows = [];
    let cursor;
    for (let page = 0; page < maxPages; page++) {
      const r = await this.query(dataSourceId, { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
      rows.push(...(r.results || []));
      if (!r.has_more) break;
      cursor = r.next_cursor;
    }
    return rows;
  }
}
