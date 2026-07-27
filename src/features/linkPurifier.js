// 链接净化器 — DSL 规则引擎 / 去跳板 / 短链解析 / 外链标记
import { addStyle } from "../core.js";

/* ── 默认规则 (DSL 文本) ── */
const DEFAULT_RULES = `
# ── 宏定义 ──
@utm     = utm_source, utm_medium, utm_campaign, utm_content, utm_term
@ad_ids  = ad_id, clickid, gclid, fbclid, sc_cid
@invite  = ic, invite, invitation, invited_by, ref, referral, referrer
@aff     = aff, affiliate, partner, promo, promocode, coupon, subid, affid, aff_id
@track   = aid, pid, cid, tid, sid, uid, ref_id, tag
@channel = via, from, source, campaign, channel

# ── 全局过滤 ──
* >> @utm, @ad_ids, @invite, @aff, @track, @channel

# ── YouTube ──
*.youtube.com youtu.be >> si, feature, pp

# ── B站 ──
*.bilibili.com b23.tv >> spm_id_from, from_source, from_spmid, from, seid, share_source, share_medium, share_plat, share_tag, share_session_id, share_from, bbid, ts, timestamp, unique_k, rt, tdsourcetag, spm, vd_source, trackid

# ── Amazon Path 正则 ──
*.amazon.com >> /\\/ref=[^\\/]+/

# ── 豁免 (防误杀) ──
~github.com ~gitlab.com ~gitee.com >> ref
~t.me ~telegram.me >> start
`.trim();

const DEF_SHORT = [
    'bit.ly', 'goo.gl', 't.co', 't.cn', 'ow.ly', 'is.gd',
    'buff.ly', 'tinyurl.com', 'tr.im', 'shorturl.at', 'rebrand.ly',
    'su.pr', 'i3z.cc', 'b23.tv'
];

const SEL = '.post-content a[href], .markdown-body a[href], .comment-content a[href]';

/* ── CSS ── */
const ICON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'%3E%3C/path%3E%3Cpolyline points='15 3 21 3 21 9'%3E%3C/polyline%3E%3Cline x1='10' y1='14' x2='21' y2='3'%3E%3C/line%3E%3C/svg%3E")`;

const CSS = `
a.nsp-ext::after{content:"";display:inline-block;width:12px;height:12px;margin-left:4px;background:${ICON_SVG} no-repeat center/contain;vertical-align:middle;opacity:.7}
a.nsp-cleaned{border-bottom:1px dashed #28a745!important;text-decoration:none}
a.nsp-cleaned:hover{background:rgba(40,167,69,.1)}
a.nsp-cleaned[data-nsp-tip]:hover::before{content:attr(data-nsp-tip);position:absolute;background:#333;color:#f0f0f0;padding:5px 10px;border-radius:4px;font-size:12px;font-family:monospace;white-space:pre;transform:translateY(-100%);margin-top:-6px;z-index:9999;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,.3);border:1px solid #444}
a.nsp-resolving{cursor:wait;opacity:.6}
a.nsp-resolving::after{content:"";display:inline-block;width:10px;height:10px;margin-left:5px;border:2px solid #888;border-top-color:transparent;border-radius:50%;animation:nsp-spin 1s linear infinite;vertical-align:middle;background-image:none!important}
@keyframes nsp-spin{to{transform:rotate(360deg)}}`;

/* ── 工具 ── */
const tryURL = (v, b) => { try { return new URL(v, b); } catch { return null; } };
const isExt = u => /^https?:$/.test(u.protocol) && u.hostname && u.hostname !== location.hostname;

/* ── DSL 规则解析器 (源自 t.js) ── */
function parseRules(text) {
    const rules = { allow: [], block: [], pathBlock: [] }, macros = {};

    text.split('\n').filter(l => l.trim() && l[0] !== '#').forEach(line => {
        if (line[0] === '@') {
            const idx = line.indexOf('=');
            if (idx === -1) return;
            macros[line.slice(0, idx).trim()] = line.slice(idx + 1).split(',').map(s => s.trim());
            return;
        }
        const idx = line.indexOf('>>');
        if (idx === -1) return;
        const scopeStr = line.slice(0, idx).trim();
        const paramStr = line.slice(idx + 2).trim();
        if (!paramStr) return;

        const isAllow = scopeStr[0] === '~';
        const scopes = scopeStr.split(/\s+/).map(s => s.replace(/^~/, ''));

        paramStr.split(',').flatMap(p => macros[p.trim()] || [p.trim()]).forEach(p => {
            if (p.startsWith('/') && p.endsWith('/')) {
                try { if (!isAllow) rules.pathBlock.push({ scopes, regex: new RegExp(p.slice(1, -1)) }); } catch { }
            } else {
                let matcher;
                if (p === '*') matcher = () => true;
                else if (p.includes('*')) {
                    const re = new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
                    matcher = t => re.test(t);
                } else {
                    const lp = p.toLowerCase();
                    matcher = t => t.toLowerCase() === lp;
                }
                rules[isAllow ? 'allow' : 'block'].push({ scopes, matcher });
            }
        });
    });
    return rules;
}

/* ── URL 净化 (源自 t.js，增加日志输出) ── */
function purifyUrl(rawUrl, rules) {
    try {
        const u = new URL(rawUrl);
        if (!u.protocol.startsWith('http')) return { url: rawUrl, logs: [] };
        if (!u.search && !u.hash.includes('?') && !rules.pathBlock.length) return { url: rawUrl, logs: [] };

        const match = (t, s) => s === '*' || t === s || t.endsWith('.' + s);
        const logs = [];

        const clean = paramStr => {
            const params = new URLSearchParams(paramStr);
            const del = [...params.keys()].filter(k => {
                const hit = list => list.some(r => r.scopes.some(s => match(u.hostname, s)) && r.matcher(k));
                return !hit(rules.allow) && hit(rules.block);
            });
            if (!del.length) return null;
            del.forEach(k => { params.delete(k); logs.push(k); });
            return params.toString();
        };

        let mod = false;
        const ns = clean(u.search);
        if (ns !== null) { u.search = ns; mod = true; }

        if (u.hash.includes('?')) {
            const qIdx = u.hash.indexOf('?');
            const hp = u.hash.slice(0, qIdx);
            const hq = u.hash.slice(qIdx + 1);
            const nh = clean(hq);
            if (nh !== null) { u.hash = nh ? `${hp}?${nh}` : hp; mod = true; }
        }

        let np = u.pathname;
        rules.pathBlock.forEach(r => {
            if (r.scopes.some(s => match(u.hostname, s))) np = np.replace(r.regex, '');
        });
        if (np !== u.pathname) { u.pathname = np.replace(/\/+/g, '/') || '/'; mod = true; logs.push('(path)'); }

        return { url: mod ? u.toString() : rawUrl, logs };
    } catch { return { url: rawUrl, logs: [] }; }
}

/* ── 去跳板 ── */
function unwrapJump(u) {
    const logs = [];
    for (let i = 0; i < 3 && u.origin === location.origin && u.pathname === '/jump' && u.searchParams.has('to'); i++) {
        const next = tryURL(u.searchParams.get('to'), location.href);
        if (!next) break;
        u = next;
        logs.push('🛡️ 去重定向直连');
    }
    return { u, logs };
}

/* ── 短链解析 ── */
const shortCache = new Map();
function resolveShort(href) {
    if (!shortCache.has(href)) {
        shortCache.set(href, new Promise(resolve => {
            const fallback = () => m === 'HEAD' ? try_('GET') : resolve({ ok: false, url: href });
            const try_ = m => GM_xmlhttpRequest({
                method: m, url: href, timeout: 10000,
                onload: r => resolve({ ok: true, url: r.finalUrl || href }),
                onerror: fallback,
                ontimeout: fallback
            });
            try_('HEAD');
        }));
    }
    return shortCache.get(href);
}

/* ── 规则编辑模态框 ── */
function openRuleEditor(ctx) {
    if (!ctx.ui.layer) return;
    const cur = ctx.store.get("link_purifier.rules", DEFAULT_RULES);
    ctx.ui.layer.open({
        type: 1, title: "📝 链接净化规则", area: ['660px', '520px'],
        content: '<div style="padding:15px"><textarea id="nsp-rule-ta" style="width:100%;height:380px;font-family:monospace;font-size:13px;line-height:1.6;resize:vertical;padding:12px;border:1px solid #ddd;border-radius:6px;white-space:pre;tab-size:4;box-sizing:border-box;outline:none"></textarea></div>',
        btn: ['保存规则', '恢复默认', '取消'],
        success: () => { const ta = document.getElementById('nsp-rule-ta'); if (ta) ta.value = cur; },
        yes(idx) {
            const ta = document.getElementById('nsp-rule-ta');
            if (ta) {
                const newRules = ta.value.trim();
                ctx.store.set("link_purifier.rules", newRules);
                ctx.ui.layer.msg("规则已保存，刷新页面后生效");
            }
            ctx.ui.layer.close(idx);
        },
        btn2: () => { const ta = document.getElementById('nsp-rule-ta'); if (ta) ta.value = DEFAULT_RULES; return false; }
    });
}

/* ── 模块导出 ── */
export default {
    id: "link_purifier",
    order: 300,
    cfg: { link_purifier: { enabled: true, short_hosts: DEF_SHORT, mark_external: true, force_blank: true, edit_rules: null } },
    meta: {
        link_purifier: {
            label: "链接净化",
            group: "实验性",
            hidden: ["rules"],
            fields: {
                short_hosts: { type: "TEXTAREA", label: "短链域名", placeholder: "每行一个域名", desc: "将这里的域名当做短链接网关，脚本会自动解析并替换为真实的最终跳转地址！" },
                mark_external: { label: "外链图标标记" },
                force_blank: { label: "外链新标签页打开" },
                edit_rules: { type: "BUTTON", label: "净化规则", buttonText: "编辑规则", action: "edit_link_rules" }
            }
        }
    },
    match: ctx => ctx.store.get("link_purifier.enabled", true),
    init(ctx) {
        addStyle("nsx-link-purifier", CSS);

        const shortHosts = new Set(ctx.store.get("link_purifier.short_hosts", DEF_SHORT).map(s => s.toLowerCase()));
        const markExt = ctx.store.get("link_purifier.mark_external", true);
        const forceBlank = ctx.store.get("link_purifier.force_blank", true);
        const activeRules = parseRules(ctx.store.get("link_purifier.rules", DEFAULT_RULES));

        document.addEventListener("nsx-action", e => {
            if (e.detail === "edit_link_rules") openRuleEditor(ctx);
        });

        const processed = new WeakMap();

        async function processLink(a) {
            const href = a.getAttribute('href');
            if (!href) return;
            if (processed.get(a) === href) return;

            let u = tryURL(href, location.href);
            if (!u) return;
            const logs = [];
            let modified = false;

            // 1. 去跳板
            const j = unwrapJump(u);
            if (j.logs.length) { u = j.u; logs.push(...j.logs); modified = true; }

            if (!a.isConnected || a.getAttribute('href') !== href) return;

            // 2. 短链解析
            if (shortHosts.has(u.hostname.toLowerCase())) {
                a.classList.add('nsp-resolving');
                const r = await resolveShort(u.toString());
                a.classList.remove('nsp-resolving');
                if (r.ok) {
                    const res = tryURL(r.url);
                    if (res) { u = res; logs.push(`🔍 短链: ${u.hostname}`); modified = true; }
                }
            }

            // 3. DSL 规则净化
            const p = purifyUrl(u.toString(), activeRules);
            if (p.logs.length) {
                u = new URL(p.url);
                logs.push(`✂️ 移除: ${p.logs.join(', ')}`);
                modified = true;
            }

            // 4. 应用结果
            if (modified) {
                a.href = u.toString();
                a.classList.add('nsp-cleaned');
                if (logs.length) a.setAttribute('data-nsp-tip', logs.join('\n'));
            }

            // 5. 外链标记
            if (isExt(u)) {
                if (markExt) a.classList.add('nsp-ext');
                if (forceBlank) {
                    a.target = '_blank';
                    if (a.relList) a.relList.add('noopener', 'noreferrer');
                }
            }
            processed.set(a, a.getAttribute('href'));
        }

        // 批处理队列
        const queue = new Set();
        let flushing = false;
        function enqueue(root) {
            if (root instanceof HTMLAnchorElement && root.matches(SEL)) queue.add(root);
            root?.querySelectorAll?.(SEL).forEach(a => queue.add(a));
            if (flushing) return;
            flushing = true;
            Promise.resolve().then(async () => {
                flushing = false;
                const batch = [...queue];
                queue.clear();
                await Promise.allSettled(batch.map(processLink));
                if (queue.size) enqueue();
            });
        }

        enqueue(document);

        const root = document.body || document.documentElement;
        if (!root) return;
        new MutationObserver(ms => {
            for (const m of ms) {
                if (m.type === 'childList') m.addedNodes.forEach(n => n.nodeType === 1 && enqueue(n));
                else if (m.type === 'attributes' && m.target instanceof HTMLAnchorElement) enqueue(m.target);
            }
        }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }
};
