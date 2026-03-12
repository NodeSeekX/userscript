// 用户卡片扩展 - 跨标签页同步未读消息
import { $, net } from "../core.js";

class Broadcast {
    static ins = new Map();
    constructor(name) {
        if (Broadcast.ins.has(name)) return Broadcast.ins.get(name);
        this.myId = `${Date.now()}-${Math.random()}`;
        this.recv = [];
        this.KEY = `nsx_tab_${name}`;
        try { this.ch = new BroadcastChannel(name); this.ch.onmessage = e => this.recv.forEach(f => f(e.data)); } catch { this.ch = null; }
        addEventListener("storage", e => { if (e.key === this.KEY) { e.newValue || localStorage.setItem(this.KEY, this.myId); this._up(); } });
        addEventListener("beforeunload", () => { if (this.active) localStorage.removeItem(this.KEY); });
        localStorage.setItem(this.KEY, this.myId);
        this._up();
        Broadcast.ins.set(name, this);
    }
    _up() { this.active = localStorage.getItem(this.KEY) === this.myId; }
    on(fn) { this.recv.push(fn); }
    send(data) { if (!this.ch) return; const m = { sender: this.myId, data }; this.ch.postMessage(m); this.recv.forEach(f => f(m)); }
    task(fn, ms) { setInterval(async () => { if (!this.active) return; try { const d = await fn(); if (d !== undefined) this.send(d); } catch { } }, ms); }
}

export default {
    id: "userCardExt",
    order: 200,
    cfg: { user_card_ext: { enabled: true } },
    meta: { user_card_ext: { label: "用户卡片扩展", group: "显示设置" } },
    match: ctx => ctx.loggedIn && (ctx.isPost || ctx.isList) && ctx.store.get("user_card_ext.enabled", true),
    async init(ctx) {
        const bn = new Broadcast("nsx_notify");
        const card = $(".user-card .user-stat");
        const last = card?.querySelector(".stat-block:first-child > :last-child");
        if (!card || !last) return;

        const atEl = last.cloneNode(true), msgEl = last.cloneNode(true);
        last.after(atEl);
        card.querySelector(".stat-block:last-child")?.append(msgEl);

        const up = (el, href, icon, text, cnt) => {
            const a = el.querySelector("a");
            if (!a) return;
            a.href = href;
            el.querySelector("a svg use")?.setAttribute("href", icon);
            const t = el.querySelector("a > :nth-child(2)");
            if (t) t.textContent = `${text} `;
            const c = el.querySelector("a > :last-child");
            if (c) { c.textContent = cnt; c.classList.toggle("notify-count", cnt > 0); }
        };
        const upAll = c => { up(atEl, "/notification#/atMe", "#at-sign", "我", c.atMe); up(msgEl, "/notification#/message?mode=list", "#envelope-one", "私信", c.message); up(last, "/notification#/reply", "#remind-6nce9p47", "回复", c.reply); };

        bn.on(({ data }) => { if (data?.type === "unreadCount" && data.counts) upAll(data.counts); });
        bn.send({ type: "unreadCount", counts: ctx.user?.unViewedCount || {}, timestamp: Date.now() });
        bn.task(async () => {
            const d = await net.get("/api/notification/unread-count");
            if (d?.success && d.unreadCount) return { type: "unreadCount", counts: d.unreadCount, timestamp: Date.now() };
            throw 0;
        }, 5000);
    }
};
