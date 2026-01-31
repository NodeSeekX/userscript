// 屏蔽帖子（关键词）
import { $$ } from "../core.js";

const mark = new WeakSet();
const run = (els, ctx) => {
    const kws = (ctx.store.get("block_posts.keywords", []) || []).map(k => String(k).trim().toLowerCase()).filter(Boolean);
    els.forEach(item => {
        if (mark.has(item)) return;
        mark.add(item);
        const title = item.querySelector(".post-title>a")?.textContent?.toLowerCase() || "";
        if (kws.some(k => title.includes(k))) item.classList.add("blocked-post");
    });
};

export default {
    id: "blockPosts",
    order: 220,
    cfg: { block_posts: { enabled: true, keywords: [] } },
    meta: { block_posts: { label: "屏蔽帖子", group: "过滤设置", fields: { keywords: { type: "TEXTAREA", label: "关键词", placeholder: "每行一个", valueType: "array" } } } },
    match: ctx => ctx.isList && ctx.store.get("block_posts.enabled", true),
    init(ctx) { run($$(".post-list-item"), ctx); },
    watch: ctx => ({ sel: ".post-list-item", fn: els => run(els, ctx), opts: { debounce: 80 } })
};
