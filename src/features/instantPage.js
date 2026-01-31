// 悬停预加载
export default {
    id: "instantPage",
    order: 320,
    cfg: { instant_page: { enabled: true } },
    meta: { instant_page: { label: "网页预加载", group: "内容设置" } },
    match: ctx => ctx.store.get("instant_page.enabled", true),
    init(ctx) {
        const done = new Set();
        const link = document.createElement("link");
        link.rel = "prefetch";
        document.body.addEventListener("mouseover", e => {
            const a = e.target.closest("a");
            if (!a?.href?.startsWith(`${location.origin}/post-`) || done.has(a.href)) return;
            setTimeout(() => {
                if (a.matches(":hover")) {
                    link.href = a.href;
                    document.head.appendChild(link);
                    done.add(a.href);
                }
            }, 65);
        }, { passive: true });
    }
};
