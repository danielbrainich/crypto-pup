// Mirrors the in-memory crypto-data cache into localStorage so a page
// reload — or a second tab — reads warm data instead of re-hitting our own
// /api/crypto-data endpoint. localStorage is shared across same-origin
// tabs, so this also means two tabs never independently refetch.
const STORAGE_KEY = "cryptopup:cache:v1";

const readStore = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const writeStore = (store) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Storage full or unavailable (private browsing, quota) — the
        // in-memory cache still works, it just won't survive a reload.
    }
};

export const readEntry = (namespace, key) => {
    const store = readStore();
    return store[namespace]?.[key] ?? null;
};

export const writeEntry = (namespace, key, data, timestamp) => {
    const store = readStore();
    store[namespace] = store[namespace] || {};
    store[namespace][key] = { data, timestamp };
    writeStore(store);
};
