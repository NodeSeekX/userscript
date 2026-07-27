// 新标签页打开站内帖子（底层同步）
export default {
    id: "openPostInNewTab",
    order: 35,
    cfg: { open_post_in_new_tab: { enabled: false } },
    meta: { open_post_in_new_tab: { label: "新标签页打开帖子", group: "内容设置" } },
    match: () => true,
    init(ctx) {
        const val = ctx.store.get("open_post_in_new_tab.enabled", false);
        try {
            ctx.uw.indexedDB.open("ns-preference-db").onsuccess = e => {
                const db = e.target.result;
                const s = db.transaction("ns-preference-store", "readwrite").objectStore("ns-preference-store");
                s.get("configuration").onsuccess = e2 => {
                    const c = e2.target.result || {};
                    if (c.openPostInNewPage !== val) {
                        c.openPostInNewPage = val;
                        s.put(c, "configuration");
                    }
                };
            };
        } catch { }
    },
    watch: ctx => {
        if (!ctx.store.get("open_post_in_new_tab.enabled", false)) return;
        return {
            sel: '.post-list-item .post-title a',
            fn: els => els.forEach(a => {
                if (a.target !== "_blank") {
                    a.target = "_blank";
                }
            }),
            opts: { debounce: 80 }
        };
    }
};
