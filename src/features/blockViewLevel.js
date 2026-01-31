// 屏蔽低等级可见帖子
import { $$ } from "../core.js";

const mark = new WeakSet();
const run = (els, ctx) => {
    const lv = ctx.user?.rank || 0;
    els.forEach(el => {
        const item = el.closest(".post-list-item");
        if (!item || mark.has(item)) return;
        mark.add(item);
        const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
        if (n > lv) item.classList.add("blocked-post");
    });
};

export default {
    id: "blockViewLevel",
    order: 222,
    match: ctx => ctx.isList,
    init(ctx) { run($$('.post-list-item use[href="#lock"]'), ctx); },
    watch: ctx => ({ sel: '.post-list-item use[href="#lock"]', fn: els => run(els, ctx), opts: { debounce: 80 } })
};
