// 已访问链接颜色
import { addStyle } from "../core.js";

const DEFAULT_LIGHT = "#afb9c1";
const DEFAULT_DARK = "#393f4e";

export default {
    id: "visitedColor",
    order: 350,
    cfg: { visited_color: { enabled: true, light: DEFAULT_LIGHT, dark: DEFAULT_DARK } },
    meta: {
        visited_color: {
            label: "已访问颜色",
            group: "显示设置",
            // cols: 2,
            fields: {
                light: { type: "COLOR", label: "浅色模式" },
                dark: { type: "COLOR", label: "深色模式" }
            }
        }
    },
    match: ctx => ctx.isList && ctx.store.get("visited_color.enabled", true),
    init(ctx) {
        const light = ctx.store.get("visited_color.light", DEFAULT_LIGHT);
        const dark = ctx.store.get("visited_color.dark", DEFAULT_DARK);
        addStyle("nsx-visited-color", `.post-list .post-title a:visited{color:${light}}body.dark-layout .post-list .post-title a:visited{color:${dark}}`);
    }
};
