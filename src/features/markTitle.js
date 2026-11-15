// 标题关键词高亮
import { $$ } from "../core.js";

const mark = new WeakSet();
const run = (els, ctx) => {
    const kws = (ctx.store.get("mark_title.keywords", []) || []).map(k => String(k).trim()).filter(Boolean);
    if (!kws.length) return;
    const pattern = new RegExp(`(${kws.sort((left, right) => right.length - left.length).map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, ctx.store.get("mark_title.ignore_case", true) ? "gi" : "g");
    els.forEach(item => {
        if (mark.has(item)) return;
        const title = item.querySelector(".post-title>a");
        if (!title?.textContent.trim()) return;
        mark.add(item);
        const parts = title.textContent.split(pattern);
        if (parts.length === 1) return;
        title.replaceChildren(...parts.map((text, index) => index % 2
            ? Object.assign(document.createElement("mark"), { className: "nsx-title-keyword", textContent: text })
            : text));
    });
};

export default {
    id: "markTitle",
    order: 220,
    cfg: { mark_title: { enabled: true, ignore_case: true, keywords: [] } },
    meta: { mark_title: { label: "标题关键词高亮", group: "显示设置", fields: { ignore_case: { label: "忽略大小写" }, keywords: { type: "TEXTAREA", label: "关键词", placeholder: "每行一个", valueType: "array" } } } },
    match: ctx => ctx.isList && ctx.store.get("mark_title.enabled", true),
    init(ctx) {
        ctx.addStyle("nsx-title-keywords", ".post-title .nsx-title-keyword{background:#fff1a8;color:#5c3b00}body.dark-layout .post-title .nsx-title-keyword{background:#6b5200;color:#fff3bf}");
        run($$(".post-list-item"), ctx);
    },
    watch: ctx => ({ sel: ".post-list-item", fn: els => run(els, ctx), opts: { debounce: 80 } })
};
