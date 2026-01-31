// 快捷键发送评论 (Ctrl+Enter)
import { $, $$ } from "../core.js";

export default {
    id: "commentShortcut",
    order: 135,
    cfg: { comment_shortcut: { enabled: true } },
    meta: { comment_shortcut: { label: "快捷键发帖", group: "内容设置" } },
    match: ctx => ctx.isPost && ctx.store.get("comment_shortcut.enabled", true),
    init(ctx) {
        const getBtn = () => $(".md-editor button.submit.btn.focus-visible");
        $$(".CodeMirror").forEach(cmEl => {
            const cm = cmEl?.CodeMirror;
            if (!cm || cm.__nsx) return;
            cm.__nsx = true;
            const bind = () => {
                const btn = getBtn();
                if (btn && !/Ctrl\+Enter/i.test(btn.textContent)) btn.textContent += "(Ctrl+Enter)";
                if (btn && !cm.__nsxMap) {
                    cm.__nsxMap = { "Ctrl-Enter": () => getBtn()?.click() };
                    cm.addKeyMap(cm.__nsxMap);
                } else if (!btn && cm.__nsxMap) {
                    cm.removeKeyMap(cm.__nsxMap);
                    cm.__nsxMap = null;
                }
            };
            bind();
            cmEl.addEventListener("focusin", bind, true);
            cmEl.addEventListener("focusout", bind, true);
        });
    }
};
