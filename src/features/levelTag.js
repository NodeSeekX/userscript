// 等级标签
import { addStyle, net } from "../core.js";

const LV_COLORS = ["#c7c2c2","#ffb74d","#ff9400","#ff5252","#e53935","#ab47bc","#8e24aa","#42a5f5","#1e88e5","#66bb6a","#2e7d32","#ffca28","#ffb300","#b388ff","#7c4dff","#000"];
const CSS = `.role-tag.user-level{background:#000;border-color:#000;color:#ffd700}${LV_COLORS.map((c, i) => `.role-tag.user-lv${i}{background:${c};border-color:${c};color:#fafafa}`).join("")}.user-reg-info{margin-left:6px;font-size:12px;font-weight:600}`;

const SEL_COMMENT = "#nsk-body .comment-container .content-item";
const SEL_ANCHOR = ".nsk-content-meta-info .author-info>a";

// ── 缓存层 ──
const _cache = new Map(), _inflight = new Map();
let _cacheTtl = 300_000;

async function fetchUser(uid) {
    const e = _cache.get(uid);
    if (e && Date.now() - e.ts < _cacheTtl) return e.data;
    if (_inflight.has(uid)) return _inflight.get(uid);
    const p = (async () => {
        try {
            const r = await net.get(`/api/account/getInfo/${uid}`);
            if (!r?.success) return null;
            _cache.set(uid, { data: r.detail, ts: Date.now() });
            return r.detail;
        } catch { return null; }
        finally { _inflight.delete(uid); }
    })();
    _inflight.set(uid, p);
    return p;
}

function extractUid(anchor) {
    const href = anchor.getAttribute("href") || "";
    const m = href.match(/\/space\/(\d+)/) || href.match(/uid=(\d+)/);
    return m?.[1];
}

function createEl(ctx, user, mode, username) {
    const days = Math.floor((Date.now() - new Date(user.created_at)) / 864e5);
    const alarm = ctx.store.get("level_tag.low_lv_alarm") && days < ctx.store.get("level_tag.low_lv_max_days", 30) ? "⚠️" : "";
    const coin = user.coin < 0 ? 0 : user.coin;
    const rank = Math.floor(Math.sqrt(coin) / 10);
    const span = document.createElement("span");
    if (mode === "inline") {
        const f = n => (n ?? 0).toLocaleString();
        span.className = "user-reg-info";
        span.style.color = LV_COLORS[rank] || LV_COLORS[15];
        if (username) span.dataset.user = username;
        span.textContent = ` · ${alarm ? alarm + " " : ""}${f(days)} 天 · 帖 ${f(user.nPost)} · 评 ${f(user.nComment)} · 🍗 ${f(user.coin)} · ✨ ${f(user.stardust)} · 粉 ${f(user.fans)}`;
    } else {
        span.className = `nsk-badge role-tag user-level user-lv${rank}`;
        span.innerHTML = `<span>${alarm}Lv ${rank}</span>`;
        span.onmouseenter = () => ctx.ui.tips?.(`注册 <span class="layui-badge">${days}</span> 天；帖子 ${user.nPost}；评论 ${user.nComment}`, span, { tips: 3, time: 0 });
        span.onmouseleave = () => ctx.ui.layer?.closeAll?.();
    }
    return span;
}

let _io;
const _observed = new WeakSet();

export default {
    id: "levelTag",
    order: 260,
    cfg: { level_tag: { enabled: true, comment_enabled: true, show_detail: false, low_lv_alarm: true, low_lv_max_days: 30, cache_ttl: 5 } },
    meta: { level_tag: { label: "等级标签", group: "显示设置", fields: {
        show_detail: { type: "SWITCH", label: "详细信息", desc: "在用户名后直接显示注册天数、发帖数等详细数据" },
        comment_enabled: { type: "SWITCH", label: "评论等级" },
        low_lv_alarm: { type: "SWITCH", label: "低等级警告" },
        low_lv_max_days: { type: "NUMBER", label: "注册天数", valueType: "number", desc: "低于此天数的新注册用户将显示 ⚠️ 警告图标" },
        cache_ttl: { type: "NUMBER", label: "缓存时间(分钟)", valueType: "number", desc: "同一用户的等级信息在内存中保留的时间，避免重复请求" }
    } } },
    match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("level_tag.enabled", true),
    async init(ctx) {
        addStyle("nsx-lv", CSS);
        _cacheTtl = ctx.store.get("level_tag.cache_ttl", 5) * 60_000;
        const detail = ctx.store.get("level_tag.show_detail", false);

        const insertFor = (container, user, anchor) => {
            const tag = createEl(ctx, user, "tag");
            anchor?.after(tag);
            if (detail) {
                const info = anchor?.closest(".author-info");
                const dl = createEl(ctx, user, "inline", anchor?.textContent?.trim());
                if (info) info.appendChild(dl); else tag.after(dl);
            }
        };

        // ── 评论等级（同步初始化，确保 watch 注册前 _io 已就绪） ──
        const commentEnabled = ctx.store.get("level_tag.comment_enabled", true);
        if (commentEnabled) {
            const processItem = async el => {
                const anchor = el.querySelector(SEL_ANCHOR);
                if (!anchor) return;
                const uid = extractUid(anchor);
                if (!uid) return;
                const user = await fetchUser(uid);
                if (!user) return;
                insertFor(el, user, anchor);
            };

            _io = new IntersectionObserver(entries => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        _io.unobserve(e.target);
                        processItem(e.target);
                    }
                }
            });

            document.querySelectorAll(SEL_COMMENT).forEach(el => {
                _observed.add(el);
                _io.observe(el);
            });
        }

        // ── 帖主等级（原有逻辑） ──
        const opUid = ctx.uw?.__config__?.postData?.op?.uid;
        if (opUid) {
            const user = await fetchUser(opUid);
            if (user) {
                const anchor = ctx.$('#nsk-body .nsk-post .nsk-content-meta-info .author-info>a');
                if (anchor) insertFor(anchor.closest('.nsk-post'), user, anchor);
            }
        }
    },
    // 处理动态加载的评论（如无限滚动）
    watch() {
        if (!_io) return null;
        return {
            sel: SEL_COMMENT,
            fn: els => {
                for (const el of els) {
                    if (!_observed.has(el)) {
                        _observed.add(el);
                        _io.observe(el);
                    }
                }
            }
        };
    }
};
