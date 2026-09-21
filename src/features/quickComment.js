// 快捷评论
import { $, $$ } from "../core.js";

export default {
    id: "quickComment",
    order: 120,
    cfg: { quick_comment: { enabled: true } },
    meta: { quick_comment: { label: "快捷评论", group: "内容设置" } },
    match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("loading_comment.enabled", true) && ctx.store.get("quick_comment.enabled", true),
    init(ctx) {
        const editor = $(".md-editor"), parent = $("#back-to-parent"), group = $("#fast-nav-button-group");
        if (!editor || !parent || !group) return;
        let open = false;

        const startDrag = e => {
            if (e.button || e.target.closest("button,a,input,svg")) return;
            e.preventDefault();
            const rect = editor.getBoundingClientRect();
            const [ox, oy] = [e.clientX - rect.left, e.clientY - rect.top];
            editor.style.top = `${rect.top}px`;
            editor.style.bottom = "auto";
            const onMove = ev => {
                const maxX = innerWidth - editor.offsetWidth, maxY = innerHeight - editor.offsetHeight;
                editor.style.left = `${Math.max(0, Math.min(ev.clientX - ox, maxX))}px`;
                editor.style.top = `${Math.max(0, Math.min(ev.clientY - oy, maxY))}px`;
            };
            const onUp = () => {
                removeEventListener("mousemove", onMove);
                removeEventListener("mouseup", onUp);
            };
            addEventListener("mousemove", onMove);
            addEventListener("mouseup", onUp);
        };

        const show = e => {
            if (open) return;
            e?.preventDefault?.();
            editor.style.cssText = `position:fixed;bottom:0;margin:0;width:100%;max-width:${editor.clientWidth || 720}px;z-index:999`;
            const bar = editor.querySelector(".tab-select.window_header");
            if (bar) { bar.style.cursor = "move"; bar.onmousedown = startDrag; }
            addClose();
            open = true;
        };

        const btn = parent.cloneNode(true);
        btn.id = "back-to-comment";
        btn.innerHTML = `<svg class="iconpark-icon" style="width:24px;height:24px"><use href="#comments"></use></svg>`;
        btn.onclick = show;
        parent.before(btn);

        $$(".nsk-post .comment-menu,.comment-container .comments").forEach(el => el.addEventListener("click", e => {
            if (["引用", "回复", "编辑"].includes(e.target?.textContent)) show(e);
        }, true));

        function addClose() {
            const tb = $("#editor-body .window_header > :last-child");
            if (!tb || $(".nsx-close-editor")) return;
            const cb = tb.cloneNode(true);
            cb.classList.add("nsx-close-editor");
            cb.title = "关闭";
            const sp = cb.querySelector("span");
            if (sp) {
                sp.classList.replace("i-icon-full-screen-one", "i-icon-close");
                sp.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M8 8L40 40M8 40L40 8" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            }
            cb.onclick = () => {
                editor.style.cssText = "";
                const bar = editor.querySelector(".tab-select.window_header");
                if (bar) { bar.style.cursor = ""; bar.onmousedown = null; }
                cb.remove(); open = false;
            };
            tb.after(cb);
        }
    }
};
