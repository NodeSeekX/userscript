// 平滑滚动
import { addStyle } from "../core.js";

export default {
    id: "smoothScroll",
    order: 340,
    cfg: { smooth_scroll: { enabled: true } },
    meta: { smooth_scroll: { label: "平滑滚动", group: "显示设置" } },
    match: ctx => ctx.store.get("smooth_scroll.enabled", true),
    init() {
        addStyle("nsx-smooth", "html{scroll-behavior:smooth}");
    }
};
