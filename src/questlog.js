// The one line the dashboard writes into Notion: the cross-border buffer in the
// 🌍 callout on the Quest log page, refreshed each morning (cron) and, as a
// fallback, the first time the dashboard opens after 07:00 Amsterdam time.
// It only ever replaces the text of that one callout.

import { Notion } from './notion.js';
import { QUEST_LOG } from './config.js';
import { store } from './usage.js';

const fmt = n => (n === null || n === undefined ? '–' : String(Math.round(n)));

// The callout's rich text, in the same shape as the other "Today at a glance"
// boxes (Roy, 29 Sep): a bold label that links to the dashboard, then one line
// with the headline numbers. The daily 💬 note underneath adds the context.
export function bufferLine(cross, today, dashboardUrl) {
  const text = (content, extra = {}) => ({ type: 'text', text: { content, ...(extra.link ? { link: { url: extra.link } } : {}) }, annotations: { bold: !!extra.bold } });
  const label = text('Cross-border', { bold: true, link: dashboardUrl });
  if (!cross || cross.ytd.be_share === null) return [label, text('\nNo work days counted yet')];
  const parts = [`${fmt(cross.ytd.be_share)}% Belgium`];
  parts.push(cross.buffer_days >= 0 ? `${fmt(cross.buffer_days)} NL days spare` : `${fmt(cross.be_days_needed)} BE days short`);
  if (cross.missing.length) parts.push(`${cross.missing.length} day${cross.missing.length === 1 ? '' : 's'} to fill in`);
  return [label, text(`\n${parts.join(' · ')}`)];
}

// The target: the callout with the marker icon, anywhere in the page's columns.
export const findCallout = blocks => blocks.find(b => b.type === 'callout' && b.callout.icon && b.callout.icon.emoji === QUEST_LOG.icon) || null;

async function pageBlocks(n, id, depth = 0) {
  const out = [];
  for (const b of await n.children(id)) {
    out.push(b);
    if (b.has_children && ['column_list', 'column'].includes(b.type) && depth < 3) out.push(...await pageBlocks(n, b.id, depth + 1));
  }
  return out;
}

export async function writeBufferLine(env, data) {
  const n = new Notion(env.NOTION_TOKEN);
  const block = findCallout(await pageBlocks(n, QUEST_LOG.page));
  if (!block) throw new Error(`No ${QUEST_LOG.icon} callout on the Quest log page`);
  await n.updateBlock(block.id, { callout: { rich_text: bufferLine(data.cross, data.today, QUEST_LOG.dashboard + '/admin#cross') } });
  await store(env).put('questlog_day', data.today);
  return block.id;
}

const amsterdamHour = now => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));

export const questLogDue = (lastDay, data, now = Date.now()) => !!data.cross && lastDay !== data.today && amsterdamHour(now) >= QUEST_LOG.hour;
export const isQuestLogHour = (now = Date.now()) => amsterdamHour(now) === QUEST_LOG.hour;
