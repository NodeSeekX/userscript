// 浏览历史
import { addStyle, $ } from "../core.js";

const CSS = `#nsx-history-panel{position:fixed;right:12px;top:56px;width:min(380px,94vw);height:70vh;background:#fff;border:1px solid #e4e4e4;border-radius:12px;box-shadow:0 16px 32px rgba(0,0,0,.12);z-index:9999;display:none;flex-direction:column;font-size:13px;color:#1f1f1f;box-sizing:border-box;font-family:"Segoe UI","Microsoft YaHei",sans-serif}#nsx-history-panel.show{display:flex}.nsx-history-header{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 6px}.nsx-history-title{font-size:15px;font-weight:600}.nsx-history-action{border:0;background:0;color:#666;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px}.nsx-history-action:hover{background:#f2f3f5}.nsx-history-search{display:flex;align-items:center;gap:6px;margin:0 12px 8px;border:1px solid #e1e1e1;border-radius:8px;padding:6px 8px}.nsx-history-search input{border:0;background:0;outline:0;width:100%;font-size:13px}.nsx-history-tabs{display:flex;gap:16px;padding:0 12px 6px;border-bottom:1px solid #f0f0f0}.nsx-history-tab{border:0;background:0;cursor:pointer;color:#6b6b6b;font-size:12px;padding:6px 0;font-weight:600;border-bottom:2px solid transparent}.nsx-history-tab.is-active{color:#0a62ff;border-bottom-color:#0a62ff}.nsx-history-list{flex:1;overflow-y:auto;padding:6px 8px 12px}.nsx-history-group{margin-bottom:10px}.nsx-history-group-title{display:flex;align-items:center;justify-content:space-between;padding:4px;color:#666;font-size:12px}.nsx-history-items{list-style:none;margin:0;padding:0}.nsx-history-item{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px}.nsx-history-item:hover{background:#f5f7fb}.nsx-history-link{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-decoration:none;color:inherit}.nsx-history-icon{width:20px;height:20px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.nsx-history-icon img{width:100%;height:100%;object-fit:cover}.nsx-history-item-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nsx-history-time{color:#9a9a9a;font-size:12px;margin-left:auto}.nsx-history-empty{padding:10px 6px;color:#999;font-size:12px}.nsx-history-close,.nsx-history-restore{border:0;background:0;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:6px;display:none}.nsx-history-close{color:#999}.nsx-history-restore{color:#0a62ff}.nsx-history-item:hover .nsx-history-time{display:none}.nsx-history-item:hover .nsx-history-close,.nsx-history-item:hover .nsx-history-restore{display:block}.nsx-history-group-title .nsx-history-close{display:block;opacity:.9}.nsx-history-close:hover{color:#ff4d4f}.nsx-history-restore:hover{background:#eef3ff}.dark-layout #nsx-history-panel{background:#1e1e1e;border-color:#3a3a3a;color:#e0e0e0}.dark-layout .nsx-history-action{color:#999}.dark-layout .nsx-history-action:hover{background:#2a2a2a}.dark-layout .nsx-history-search{border-color:#3a3a3a}.dark-layout .nsx-history-search input{color:#e0e0e0}.dark-layout .nsx-history-tabs{border-bottom-color:#3a3a3a}.dark-layout .nsx-history-tab{color:#999}.dark-layout .nsx-history-group-title{color:#888}.dark-layout .nsx-history-item:hover{background:#2a2a2a}.dark-layout .nsx-history-icon{background:#3a3a3a}.dark-layout .nsx-history-time{color:#666}.dark-layout .nsx-history-empty{color:#666}`;

const HKEY = "nsx_browsing_history", RKEY = "nsx_recently_closed";

const pad = n => String(n).padStart(2, "0");
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const now = () => new Date().toISOString();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export default {
    id: "history",
    order: 300,
    cfg: { history: { enabled: true, limit: 100, days: 7 } },
    meta: { history: { label: "浏览历史", group: "显示设置", fields: { limit: { type: "NUMBER", label: "保存上限", valueType: "number" }, days: { type: "NUMBER", label: "保存天数", valueType: "number" } } } },
    match: ctx => (ctx.isPost || ctx.isList) && ctx.store.get("history.enabled", true),
    init(ctx) {
        const maxItems = ctx.store.get("history.limit", 100) || 100;
        const maxAge = (ctx.store.get("history.days", 7) || 7) * 864e5;

        const prune = arr => {
            const t = Date.now();
            return (arr || []).filter(i => t - new Date(i.time).getTime() < maxAge).sort((a, b) => new Date(a.time) - new Date(b.time)).slice(-maxItems);
        };
        const load = k => { try { const r = JSON.parse(localStorage.getItem(k) || "[]"); const n = prune(r); if (n.length !== r.length) localStorage.setItem(k, JSON.stringify(n)); return n; } catch { return []; } };
        const save = (k, a) => localStorage.setItem(k, JSON.stringify(prune(a)));
        const getH = () => load(HKEY), saveH = a => save(HKEY, a);
        const getR = () => load(RKEY), saveR = a => save(RKEY, a);

        // 使用 postData 获取帖子信息
        const add = (pd, list, saveFn) => {
            if (!pd?.postId) return;
            const id = pd.postId;
            const h = list(), i = h.findIndex(x => x.postId === id);
            const e = { postId: id, title: pd.title || document.title, time: now(), uid: pd.op?.uid || null, author: pd.op?.name || null };
            i > -1 ? Object.assign(h[i], e) : h.push(e);
            saveFn(h);
        };

        addStyle("nsx-hist", CSS);
        let panel = null, trigger = null, state = { open: false, tab: "all", kw: "" };

        const orig = $("#nsk-head .color-theme-switcher");
        if (!orig) return;
        trigger = orig.cloneNode(false);
        trigger.classList.replace("color-theme-switcher", "history-dropdown-on");
        trigger.title = "历史记录";
        trigger.innerHTML = `<svg class="iconpark-icon" style="width:17px;height:17px"><use href="#history"></use></svg>`;
        orig.before(trigger);

        const fmtDayTitle = day => {
            const d = new Date(`${day}T00:00:00`);
            const title = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`;
            return day === fmtDate(new Date()) ? `今天 - ${title}` : title;
        };

        const open = () => {
            if (!panel) {
                panel = document.createElement("div");
                panel.id = "nsx-history-panel";
                panel.innerHTML = `<div class="nsx-history-header"><div class="nsx-history-title">历史记录</div><button class="nsx-history-action" data-a="clear">清空</button></div><div class="nsx-history-search">🔍<input placeholder="搜索"/></div><div class="nsx-history-tabs"><button class="nsx-history-tab is-active" data-t="all">全部</button><button class="nsx-history-tab" data-t="recent">最近关闭</button></div><div class="nsx-history-list"></div>`;
                document.body.appendChild(panel);
                panel.querySelector("input").oninput = e => { state.kw = e.target.value.toLowerCase(); render(); };
                panel.onclick = e => {
                    e.stopPropagation();
                    const t = e.target.closest("[data-t]");
                    if (t) { state.tab = t.dataset.t; render(); return; }
                    const a = e.target.closest("[data-a]");
                    if (!a) return;
                    const act = a.dataset.a, id = a.dataset.id;
                    if (act === "clear") ctx.ui.confirm("确认", "确定要清空所有记录吗？", () => { localStorage.removeItem(state.tab === "recent" ? RKEY : HKEY); render(); });
                    if (act === "del") { state.tab === "recent" ? saveR(getR().filter(x => x.postId != id)) : saveH(getH().filter(x => x.postId != id)); render(); }
                    if (act === "clear-day") { const key = state.tab === "recent" ? RKEY : HKEY; save(key, load(key).filter(i => fmtDate(new Date(i.time)) !== a.dataset.day)); render(); }
                    if (act === "restore") window.open(`/post-${id}-1`, "_blank");
                };
                document.addEventListener("click", e => { if (state.open && !panel.contains(e.target) && !trigger.contains(e.target)) close(); });
                document.addEventListener("keydown", e => { if (state.open && e.key === "Escape") close(); });
            }
            const r = trigger.getBoundingClientRect();
            panel.style.top = `${r.bottom + 8}px`;
            panel.style.height = `${innerHeight - r.bottom - 16}px`;
            render();
            panel.classList.add("show");
            state.open = true;
        };
        const close = () => { panel?.classList.remove("show"); state.open = false; };
        const toggle = () => state.open ? close() : open();

        const render = () => {
            let list = (state.tab === "recent" ? getR() : getH()).sort((a, b) => new Date(b.time) - new Date(a.time));
            if (state.kw) list = list.filter(i => (i.title || "").toLowerCase().includes(state.kw));
            panel.querySelectorAll(".nsx-history-tab").forEach(b => b.classList.toggle("is-active", b.dataset.t === state.tab));
            const lEl = panel.querySelector(".nsx-history-list");
            if (!list.length) { lEl.innerHTML = `<div class="nsx-history-empty">暂无记录</div>`; return; }
            const g = {};
            list.forEach(i => { const d = fmtDate(new Date(i.time)); (g[d] ||= []).push(i); });
            lEl.innerHTML = Object.entries(g).map(([day, items]) => {
                const itemsHtml = items.map(i => {
                    if (!i.postId) return "";
                    const url = `/post-${i.postId}-1`;
                    const avatar = i.uid ? `<img src="/avatar/${i.uid}.png" onerror="this.style.display='none'">` : "";
                    const restore = state.tab === "recent" ? `<button class="nsx-history-restore" data-a="restore" data-id="${i.postId}" title="恢复">↗</button>` : "";
                    return `<li class="nsx-history-item"><a class="nsx-history-link" href="${url}"><span class="nsx-history-icon"${i.author ? ` title="@${esc(i.author)}"` : ""}>${avatar}</span><span class="nsx-history-item-title">${esc((i.title || "").slice(0, 32))}</span></a><span class="nsx-history-time">${fmtTime(new Date(i.time))}</span>${restore}<button class="nsx-history-close" data-a="del" data-id="${i.postId}">✖</button></li>`;
                }).join("");
                return `<div class="nsx-history-group"><div class="nsx-history-group-title"><span>${fmtDayTitle(day)}</span><button class="nsx-history-close" data-a="clear-day" data-day="${day}" title="清除当天">✕</button></div><ul class="nsx-history-items">${itemsHtml}</ul></div>`;
            }).join("");
        };

        trigger.onclick = e => { e.preventDefault(); e.stopPropagation(); toggle(); };

        // 记录当前页面
        const pd = ctx.uw?.__config__?.postData;
        if (pd) add(pd, getH, saveH);

        // 监听页面关闭
        addEventListener("beforeunload", () => {
            const pd = ctx.uw?.__config__?.postData;
            if (pd) add(pd, getR, saveR);
        }, { capture: true });
    }
};
