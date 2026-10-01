// A short-lived cache in the Store (src/store.js). The Cache API
// (caches.default) does nothing on a workers.dev address, so the pages' data
// is kept here instead: one value per key, with the time it was built.
import { store } from './usage.js';

export async function cached(env, key, maxSeconds) {
  if (!env.STORE) return null;
  const hit = await store(env).get(`cache:${key}`).catch(() => null);
  return hit && Date.now() - hit.at < maxSeconds * 1000 ? hit.data : null;
}

export async function remember(env, key, data) {
  if (!env.STORE) return;
  await store(env).put(`cache:${key}`, { at: Date.now(), data }).catch(e => console.warn('cache', key, e.message || e));
}
