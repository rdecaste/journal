// The dashboard's only state, in one small Durable Object: today's AI summary
// (so it is paid for once a day), the dashboard's own OpenAI usage and the
// journal page's folded halves.
import { DurableObject } from 'cloudflare:workers';
import { FOLD_KEY, mergeFold } from './fold.js';

export class Store extends DurableObject {
  async get(key) {
    return (await this.ctx.storage.get(key)) ?? null;
  }

  async put(key, value) {
    await this.ctx.storage.put(key, value);
  }

  // True once per day, so two page loads never pay for two summaries.
  async claim(key, day) {
    if ((await this.ctx.storage.get(key)) === day) return false;
    await this.ctx.storage.put(key, day);
    return true;
  }

  // The journal page's folded halves for the day (src/fold.js), changed in one step so two taps can't undo each other.
  async fold(day, patch) {
    const next = mergeFold(await this.ctx.storage.get(FOLD_KEY), day, patch);
    await this.ctx.storage.put(FOLD_KEY, next);
    return next;
  }
}

