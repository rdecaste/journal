// A read-only Notion client: data source queries with retries for rate limits.
const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';

export class Notion {
  constructor(token) {
    if (!token) throw new Error('NOTION_TOKEN is not set');
    this.token = token;
  }

  async query(dataSourceId, body) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${API}/data_sources/${dataSourceId}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      if (!(response.status === 429 || response.status >= 500) || attempt >= 3) throw new Error(`Notion ${response.status}: ${data.message || 'query failed'}`);
      await new Promise(r => setTimeout(r, Number(response.headers.get('Retry-After')) * 1000 || 400 * 2 ** attempt));
    }
  }

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
