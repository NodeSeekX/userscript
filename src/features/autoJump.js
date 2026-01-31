// 自动跳转外部链接
import { $$ } from "../core.js";

export default {
    id: "autoJump",
    order: 60,
    cfg: { auto_jump_external_links: { enabled: true } },
    meta: { auto_jump_external_links: { label: "自动跳转外部链接", group: "基本设置" } },
    match: ctx => ctx.store.get("auto_jump_external_links.enabled", true),
    init(ctx) {
        $$('a[href*="/jump?to="]').forEach(a => {
            try {
                const to = new URL(a.href).searchParams.get("to");
                if (to) a.href = decodeURIComponent(to);
            } catch { }
        });
        if (/^\/jump/.test(location.pathname)) ctx.$(".btn")?.click();
    }
};
