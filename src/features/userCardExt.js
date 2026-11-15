// 用户卡片扩展 - 跨标签页同步未读消息
import { $, $$, net } from "../core.js";

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
        const favicons = $$("head link[rel~='icon']").map(icon => [icon, icon.href]);
        const originalTitle = document.title;
        let unread = -1;
        const stopNotice = () => {
            document.title = originalTitle;
            favicons.forEach(([icon, href]) => icon.href = href);
        };
        const updateNotice = counts => {
            const next = +counts.all || 0, hasNew = unread >= 0 && next > unread;
            unread = next;
            if (!next) return stopNotice();
            if (!hasNew) return;
            stopNotice();
            document.title = `(${next}) ${originalTitle}`;
            favicons.forEach(([icon]) => icon.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAADAFBMVEUAAADS0tLS0tLS0tKakJHS0tLS0tLS0tLS0tLS0tLT09PS0tLT09PS0tLS0tLS0tLS0tLS0tLS0tLT09PS0tLS0tLT09PS0tLS0tLS0tLT09PS0tLT09PS0tIbGxvS0tLS0tLS0tIoGRobGxvS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIXFxfS0tLS0tIbGxvS0tLS0tIbGxvS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIbGxvS0tIaGhoaGhobGxvS0tLS0tIZGRnT09PS0tLS0tIZGRkbGxvS0tLS0tLS0tLS0tLS0tLS0tLS0tIbGxsaGhoZGRnS0tLS0tLmABLS0tLS0tLS0tLS0tLS0tIZGRkaGhoZGRnS0tLS0tLS0tLS0tIbGxsYGBgaGhrmABIaGhoZGRkZGRnT09PS0tLmABIbGxsaGhoaGhoaGhoaGhoaGhoaGhobGxvmABLmABIZGRkaGhoaGhoaGhrmABLmABLmABIaGhrS0tLmABIaGhoaGhoaGhobGxsaGhoaGhrmABLmABLmARIZGRkaGhobGxsZGRkaGhrmABLmABIaGhobGxsbGxsbGxsbGxsaGhrmABIaGhrmABLmABLmABLmABLmABIaGhrmABLmABLmABLmBhYbGxvR0dHmABLmABLmABLmABLmABLmABLmABLmABLVuLrkGinTxMXS0tIbGxvmABLT09McHBz////S0tIWFhYZGRn8/Pzi4uKKioomJiYODg76+vpQUFAfHx/+/v5VVVUSEhL19fXv7+9UVFTY2Njp6ekrKyvlCRqjo6Pd3d1wcHB5eXn4+PhFRUWvr686Ojq8vLw/Pz+ampoNDQ0jIyPNzMzBwcFfX19oaGjiKzozMzNYWFhLS0uFhYWAgIDccXrFxcXhOEW4uLiVlZXXpKjWsrXfUVzkGinTw8TZipDdYWvZjpTCq6yKIb56AAAAwHRSTlMADf37AQIEPesV/gf95goTD/AZ+O3N9uNZrdxE8rH9g0AtAvod4SYRucLZmdCn0yPWyUiRfHNoBH869PhV+GC0uzJ3im+Vjoeh6U83COhMEwfxxlIYBRs1HeLeFvMhHpwq2GMMY2Xxqmy3wDAhNSa+pJ4ouA+PzNQ6Rfpc+e8/akuul2+znP5UnSuJBsIydBcihFzL36ijGrgrL1jPCnpr9lDcwuzFf0HIEqFW43q/SVzgrb3qeI2Eez1ePF3J0P7EI/bjAAAA8UlEQVR42u2TrQ4CMQzHK5AI8AiQ4ECcAgEOEiTy3gB5AiSPgEbxKLvuGiSPxPqxsYOEYElost3d+uu/bboD+JsZIW9E7TOSQ3mnfjwAOHu3V4KdGsXbTlTAO7Wky2FzQcUfXD4RI5XgtbRkFs7M1iQmQYJ9YwV80zjPm0gglUIxiNQBqJwTXwRWliOV4HLgYtWzgtUiLdy4iHtYB2vBakDqxSKfbUyzFMVrF966KINCN+VYmD8QlZWAVChJOBMJb0z4WCOmMaWxnDRJiK/ZYCjHG82BOsbrUR4C1DZhpEFGZP66fQXgHfhwib4DfueneAC6x+uQp8GIpgAAAABJRU5ErkJggg==");
        };

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

        bn.on(({ data }) => {
            if (data?.type !== "unreadCount" || !data.counts) return;
            upAll(data.counts);
            updateNotice(data.counts);
        });
        bn.send({ type: "unreadCount", counts: ctx.user?.unViewedCount || {}, timestamp: Date.now() });
        bn.task(async () => {
            const d = await net.get("/api/notification/unread-count");
            if (d?.success && d.unreadCount) return { type: "unreadCount", counts: d.unreadCount, timestamp: Date.now() };
            throw 0;
        }, 5000);
    }
};
