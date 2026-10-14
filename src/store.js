// Small localStorage wrapper. Private browsing may refuse storage: then nothing is kept.
const PREFIX = 'firepanel.';

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  del(key) {
    try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
  },
};
