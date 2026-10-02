// The evening question: one small OpenAI call writes the Reflection question
// from the whole morning (headspace, looking forward, win if), when Roy
// taps "Start my day ☀" or first opens the evening. Kept in the Store
// per day; asked again only when the morning changed, at most a few times a
// day. Off unless ADMIN_AI is "1"; the 03:00 question stays until then.

import { store, addUsage } from './usage.js';

export const EVENING_SYSTEM = [
  'You write the one evening question on Roy\'s private journal page, under the heading Reflection.',
  'You get what he wrote this morning: his headspace, what he looked forward to, and what would make today a win.',
  'Write one or two short sentences, at most 45 words: briefly reflect the morning back in your own words (not quoted), then ask one open question about how the day actually went.',
  'Plain, warm, everyday English, like a thoughtful friend. No advice, no praise, no numbers, no lists, no emojis.',
  'Never mention habits, cravings, relapse or streaks. Return only the question text.'
].join(' ');

const MAX_PER_DAY = 5;
const clean = (v, max = 500) => String(v || '').trim().slice(0, max);

// What the model sees: the morning's words, nothing else.
export function morningFacts(m = {}) {
  const out = { headspace: clean(m.headspace), looking_forward_to: clean(m.forward), today_is_a_win_if: clean(m.winif, 300) };
  return out.headspace || out.looking_forward_to || out.today_is_a_win_if ? out : null;
}

export const aiOn = env => env.ADMIN_AI === '1' && !!env.OPENAI_API_KEY;

// Today's question if there is one ({ day, text, … } or null).
export async function eveningQuestion(env, day) {
  if (!env.STORE) return null;
  const q = await store(env).get('evening_q');
  return q && q.day === day && q.text ? q : null;
}

export async function writeEveningQuestion(env, day, morning, { now = Date.now() } = {}) {
  const facts = morningFacts(morning);
  if (!facts || !aiOn(env)) return null;
  const s = store(env);
  const last = await s.get('evening_q');
  const today = last && last.day === day ? last : null;
  const hash = JSON.stringify(facts);
  if (today && (today.hash === hash || (today.n || 0) >= MAX_PER_DAY || now - Date.parse(today.at) < 60000)) return today;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.CHAT_MODEL, max_completion_tokens: 200, messages: [{ role: 'system', content: EVENING_SYSTEM }, { role: 'user', content: JSON.stringify(facts) }] })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(body.error && body.error.message) || 'failed'}`);
  await s.put('usage', addUsage(await s.get('usage'), { chat_calls: 1, chat_in: (body.usage && body.usage.prompt_tokens) || 0, chat_out: (body.usage && body.usage.completion_tokens) || 0 }, now));
  const text = String(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content || '').trim().replace(/^["“]|["”]$/g, '');
  if (!text) throw new Error('OpenAI returned no text');
  const q = { day, at: new Date(now).toISOString(), hash, text, n: ((today && today.n) || 0) + 1 };
  await s.put('evening_q', q);
  return q;
}
