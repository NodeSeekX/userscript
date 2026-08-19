// NSX Core - 核心
// 环境 + DOM + 网络 + 存储 + 模块管理

const SITES = [
    { host: "www.nodeseek.com", code: "ns", name: "NodeSeek" },
    { host: "www.deepflood.com", code: "df", name: "DeepFlood" }
];

const info = GM_info?.script || {};
const site = SITES.find(s => s.host === location.host);
let debug = false;
try { debug = GM_getValue("settings", {})?.debug?.enabled; } catch { }

// ===== 环境 =====
export const env = {
    info, site, BASE_URL: location.origin,
    log: (...a) => debug && console.log(`[NSX]`, ...a),
    warn: (...a) => debug && console.warn(`[NSX]`, ...a),
    error: (...a) => console.error(`[NSX]`, ...a)
};

// ===== DOM =====
export const $ = (s, r = document) => r?.querySelector(s);
export const $$ = (s, r = document) => [...(r?.querySelectorAll(s) || [])];

export function addStyle(id, val) {
    if (document.getElementById(id)) return;
    const isUrl = /^(https?:|blob:|data:)/.test(val) || /^\/\//.test(val);
    const el = document.createElement(isUrl ? "link" : "style");
    el.id = id;
    isUrl ? (el.rel = "stylesheet", el.href = val) : (el.textContent = val);
    document.head?.appendChild(el);
}

export function addScript(id, val, onload) {
    if (document.getElementById(id)) return null;
    const el = document.createElement("script");
    el.id = id;
    if (/^(https?:)?\/\//.test(val)) { el.src = val; if (onload) el.onload = onload; }
    else el.textContent = val;
    document.body?.appendChild(el);
    return el;
}

export const debounce = (fn, ms) => {
    let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.cancel = () => clearTimeout(t); return d;
};

export const throttle = (fn, ms) => {
    let last = 0;
    return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } };
};

// ===== 存储 =====
const cfgFragments = new Map(), metaFragments = new Map();
let cfgCache = null;

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const merge = (t, s) => { for (const k in s) isObj(s[k]) ? (isObj(t[k]) || (t[k] = {}), merge(t[k], s[k])) : t[k] === undefined && (t[k] = s[k]); };
const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split("."), l = ks.pop(); ks.reduce((a, k) => a[k] ??= {}, o)[l] = v; };

export const store = {
    reg(id, cfg, meta) { cfg && cfgFragments.set(id, cfg); meta && metaFragments.set(id, meta); },
    getDefaults() { const d = { version: info.version, debug: { enabled: false } }; cfgFragments.forEach(f => merge(d, f)); return d; },
    getMeta() { const m = {}; metaFragments.forEach(f => merge(m, f)); return m; },
    init() {
        if (cfgCache) return cfgCache;
        const def = this.getDefaults();
        cfgCache = GM_getValue("settings", null) || {};
        merge(cfgCache, def);
        cfgCache.version = def.version;
        GM_setValue("settings", cfgCache);
        return cfgCache;
    },
    get(p, fb) { const v = getPath(this.init(), p); return v === undefined ? fb : v; },
    set(p, v) { setPath(this.init(), p, v); GM_setValue("settings", cfgCache); }
};

// ===== 网络 =====
export const net = {
    async fetch(url, { method = "GET", data, headers = {}, type = "json" } = {}) {
        const r = await fetch(url.startsWith("http") ? url : env.BASE_URL + url, {
            method, credentials: "include",
            headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...headers },
            body: data ? JSON.stringify(data) : undefined
        });
        return r[type]().catch(() => null);
    },
    get: (u, h, t) => net.fetch(u, { headers: h, type: t }),
    post: (u, d, h, t) => net.fetch(u, { method: "POST", data: d, headers: h, type: t })
};

// ===== 模块管理 =====
const modules = new Map();

export function define(cfg) {
    if (!cfg?.id) throw new Error("id required");
    cfg.deps ??= [];
    cfg.order ??= 100;
    modules.set(cfg.id, cfg);
    cfg.cfg && store.reg(cfg.id, cfg.cfg, cfg.meta);
    return cfg;
}

export function boot(ctx) {
    store.init();
    // 拓扑排序
    const list = [...modules.values()];
    const indeg = new Map(list.map(m => [m.id, 0]));
    const edges = new Map(list.map(m => [m.id, []]));
    list.forEach(m => m.deps.forEach(d => { if (modules.has(d)) { edges.get(d).push(m.id); indeg.set(m.id, indeg.get(m.id) + 1); } }));
    const q = list.filter(m => indeg.get(m.id) === 0).sort((a, b) => a.order - b.order);
    const sorted = [];
    while (q.length) {
        const cur = q.shift(); sorted.push(cur);
        edges.get(cur.id).forEach(n => { indeg.set(n, indeg.get(n) - 1); if (!indeg.get(n)) q.push(modules.get(n)); });
        q.sort((a, b) => a.order - b.order);
    }
    // 初始化与注册监听
    sorted.forEach(m => {
        try {
            if (m.match?.(ctx) !== false) {
                m.init?.(ctx);
                if (ctx.watch && m.watch) {
                    const w = typeof m.watch === "function" ? m.watch(ctx) : m.watch;
                    [].concat(w || []).filter(Boolean).forEach(i => ctx.watch(i.sel, i.fn, i.opts));
                }
            }
        } catch (e) {
            env.error(m.id, e);
        }
    });
}
