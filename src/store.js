// The dashboard's only state, in one small Durable Object: today's AI summary
// (so it is paid for once a day) and the dashboard's own OpenAI usage.
import { DurableObject } from 'cloudflare:workers';

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
}

