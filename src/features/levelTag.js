// 等级标签
import { addStyle, net } from "../core.js";

const LV_COLORS = ["#c7c2c2", "#ffb74d", "#ff9400", "#ff5252", "#e53935", "#ab47bc", "#8e24aa", "#42a5f5", "#1e88e5", "#66bb6a", "#2e7d32", "#ffca28", "#ffb300", "#b388ff", "#7c4dff", "#000"];
const CSS = `.role-tag.user-level{background:#000;border-color:#000;color:#ffd700}${LV_COLORS.map((c, i) => `.role-tag.user-lv${i}{background:${c};border-color:${c};color:#fafafa}`).join("")}.user-reg-info{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 6px;padding:2px 8px;margin-bottom:6px;font-size:11px;line-height:1.4;color:#64748b;background:rgba(125,125,125,.08);border:1px solid rgba(125,125,125,.12);border-radius:6px;width:fit-content;max-width:100%;box-sizing:border-box}body.dark-layout .user-reg-info{color:#94a3b8;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.08)}.user-reg-item{display:inline-flex;align-items:center;gap:2px}.user-reg-label{opacity:.75;font-size:10.5px}.user-reg-icon{font-size:11px}.user-reg-val{font-weight:600;color:#334155}body.dark-layout .user-reg-val{color:#cbd5e1}.user-reg-sep{color:rgba(125,125,125,.35);font-size:10px;user-select:none}.user-reg-info,.user-reg-info *{transition:color .2s,background-color .2s,border-color .2s,opacity .2s}.user-reg-info:hover{color:#334155;background:rgba(125,125,125,.16);border-color:rgba(125,125,125,.3)}.user-reg-info:hover .user-reg-label{opacity:1}.user-reg-info:hover .user-reg-val{color:#0f172a}.user-reg-info:hover .user-reg-sep{color:rgba(125,125,125,.7)}body.dark-layout .user-reg-info:hover{color:#cbd5e1;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22)}body.dark-layout .user-reg-info:hover .user-reg-val{color:#f1f5f9}`;

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
    const calcRank = ctx.store.get("level_tag.calc_rank", false);
    const rank = calcRank ? Math.floor(Math.sqrt(coin) / 10) : (user.rank !== undefined ? user.rank : Math.floor(Math.sqrt(coin) / 10));
    if (mode === "inline") {
        const f = n => (n ?? 0).toLocaleString();
        const div = document.createElement("div");
        div.className = "user-reg-info";
        if (username) div.dataset.user = username;
        const items = [
            { label: "注册", val: `${f(days)}天` },
            { label: "帖", val: f(user.nPost) },
            { label: "评", val: f(user.nComment) },
            { icon: "🍗", val: f(user.coin) },
            { icon: "✨", val: f(user.stardust) },
            { label: "粉", val: f(user.fans) }
        ];
        div.innerHTML = items.map(item =>
            `<span class="user-reg-item">${item.icon ? `<span class="user-reg-icon">${item.icon}</span>` : `<span class="user-reg-label">${item.label}</span>`}<span class="user-reg-val">${item.val}</span></span>`
        ).join('<span class="user-reg-sep">|</span>');
        return div;
    }
    const span = document.createElement("span");
    span.className = `nsk-badge role-tag user-level user-lv${rank}`;
    span.innerHTML = `<span>${alarm}Lv ${rank}</span>`;
    span.onmouseenter = () => ctx.ui.tips?.(`注册 <span class="layui-badge">${days}</span> 天；帖子 ${user.nPost}；评论 ${user.nComment}`, span, { tips: 3, time: 0 });
    span.onmouseleave = () => ctx.ui.layer?.closeAll?.();
    return span;
}

let _io;
const _observed = new WeakSet();

export default {
    id: "levelTag",
    order: 260,
    cfg: { level_tag: { enabled: true, calc_rank: false, comment_enabled: true, show_detail: false, low_lv_alarm: true, low_lv_max_days: 30, cache_ttl: 5 } },
    meta: {
        level_tag: {
            label: "等级标签", group: "显示设置", fields: {
                calc_rank: { type: "SWITCH", label: "肝帝显形", desc: "开启时根据鸡腿数计算并显示等级，关闭时显示真实等级" },
                show_detail: { type: "SWITCH", label: "详细信息", desc: "在用户名后直接显示注册天数、发帖数等详细数据" },
                comment_enabled: { type: "SWITCH", label: "评论等级", desc: "开启后会在评论列表显示等级标签" },
                low_lv_alarm: { type: "SWITCH", label: "低等级警告", desc: "在注册天数低于设定值时，用户名前显示 ⚠️ 警告图标" },
                low_lv_max_days: { type: "NUMBER", label: "注册天数", valueType: "number", desc: "低于此天数的用户将显示 ⚠️ 警告图标" },
                cache_ttl: { type: "NUMBER", label: "缓存时间(分钟)", valueType: "number", desc: "同一用户的等级信息在内存中保留的时间，避免重复请求" }
            }
        }
    },
    match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("level_tag.enabled", true),
    async init(ctx) {
        addStyle("nsx-lv", CSS);
        _cacheTtl = ctx.store.get("level_tag.cache_ttl", 5) * 60_000;
        const detail = ctx.store.get("level_tag.show_detail", false);

        const insertFor = (container, user, anchor) => {
            if (!anchor?.nextElementSibling?.classList?.contains("user-level")) {
                const tag = createEl(ctx, user, "tag");
                anchor?.after(tag);
            }
            if (detail) {
                const meta = anchor?.closest(".nsk-content-meta-info");
                if (meta && meta.previousElementSibling?.classList?.contains("user-reg-info")) return;
                const dl = createEl(ctx, user, "inline", anchor?.textContent?.trim());
                if (meta) meta.before(dl); else anchor?.after(dl);
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
