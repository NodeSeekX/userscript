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
                const tx = db.transaction("ns-preference-store", "readwrite");
                tx.oncomplete = tx.onabort = () => db.close();
                const s = tx.objectStore("ns-preference-store");
                s.get("configuration").onsuccess = e2 => {
                    const c = e2.target.result || {};
                    if (c.openPostInNewPage !== val) {
                        c.openPostInNewPage = val;
                        s.put(c, "configuration");
                    }
                };
            };
        } catch { }
        const isSearch = /^\/search\/?$/.test(location.pathname);
        if (!isSearch && !val) return;

        const selector = isSearch ? "a[href]" : ".post-list-item .post-title a";
        const target = val ? "_blank" : "_self";
        const applyTarget = links => {
            links.forEach(a => {
                if (isSearch && (a.origin !== location.origin || !/^\/post-\d+(?:-\d+)?\/?$/.test(a.pathname))) return;
                if (a.target !== target) a.target = target;
            });
        };
        applyTarget(ctx.$$(selector));
        ctx.watch(selector, applyTarget);
    }
};
