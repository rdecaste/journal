// The one line the dashboard writes into Notion: the cross-border buffer in the
// 🌍 callout on the Quest log page, refreshed each morning (cron) and, as a
// fallback, the first time the dashboard opens after 07:00 Amsterdam time.
// It only ever replaces the text of that one callout.

import { Notion } from './notion.js';
import { QUEST_LOG } from './config.js';
import { store } from './usage.js';

const fmt = n => (n === null || n === undefined ? '–' : String(Math.round(n)));
// Spelled out by hand: ICU writes "Sept" in some runtimes and "Sep" in others.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = day => { const d = new Date(day + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

// The callout's rich text: a bold label, the numbers, a link to the dashboard.
export function bufferLine(cross, today, dashboardUrl) {
  const text = (content, extra = {}) => ({ type: 'text', text: { content, ...(extra.link ? { link: { url: extra.link } } : {}) }, annotations: { bold: !!extra.bold } });
  if (!cross || cross.ytd.be_share === null) return [text('Cross-border buffer', { bold: true }), text(' · no work days counted yet · '), text('Open dashboard', { link: dashboardUrl })];
  const parts = [`Belgium ${fmt(cross.ytd.be_share)}% this year (needs to stay above ${cross.minimum}%)`];
  parts.push(cross.buffer_days >= 0 ? `${fmt(cross.buffer_days)} NL days of buffer` : `${fmt(cross.be_days_needed)} BE days short`);
  if (cross.projection) parts.push(`heading for ${fmt(cross.projection.year_end_be_share)}% by year end`);
  if (cross.missing.length) parts.push(`${cross.missing.length} work day${cross.missing.length === 1 ? '' : 's'} to fill in`);
  return [
    text('Cross-border buffer', { bold: true }),
    text(` · ${parts.join(' · ')} · updated ${shortDay(today)} · `),
    text('Open dashboard', { link: dashboardUrl })
  ];
}

// The target: the page's top-level callout with the marker icon.
export const findCallout = blocks => blocks.find(b => b.type === 'callout' && b.callout.icon && b.callout.icon.emoji === QUEST_LOG.icon) || null;

export async function writeBufferLine(env, data) {
  const n = new Notion(env.NOTION_TOKEN);
  const block = findCallout(await n.children(QUEST_LOG.page));
  if (!block) throw new Error(`No ${QUEST_LOG.icon} callout on the Quest log page`);
  await n.updateBlock(block.id, { callout: { rich_text: bufferLine(data.cross, data.today, QUEST_LOG.dashboard) } });
  await store(env).put('questlog_day', data.today);
  return block.id;
}

const amsterdamHour = now => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));

export const questLogDue = (lastDay, data, now = Date.now()) => !!data.cross && lastDay !== data.today && amsterdamHour(now) >= QUEST_LOG.hour;
export const isQuestLogHour = (now = Date.now()) => amsterdamHour(now) === QUEST_LOG.hour;
