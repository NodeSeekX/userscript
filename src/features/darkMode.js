// 暗色模式样式切换
import { addStyle } from "../core.js";

export default {
    id: "darkMode",
    order: 180,
    init(ctx) {
        const body = document.body;
        if (!body) return;
        const lightHl = GM_getResourceURL("highlightStyle");
        const darkHl = GM_getResourceURL("highlightStyle_dark");

        const apply = () => {
            const dark = body.classList.contains("dark-layout");
            // 为 html 添加/移除 .dark 类以触发 layui 深色主题
            document.documentElement.classList.toggle("dark", dark);
            // 切换 highlight.js 样式
            document.getElementById("nsx-hl")?.remove();
            addStyle("nsx-hl", dark ? darkHl : lightHl, "link");
        };
        apply();
        new MutationObserver(() => apply()).observe(body, { attributes: true, attributeFilter: ["class"] });
    }
};
