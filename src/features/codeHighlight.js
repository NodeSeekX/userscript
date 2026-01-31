// 代码高亮 + 复制按钮
import { addStyle, $$ } from "../core.js";

const CSS = `.post-content pre{position:relative}.post-content pre span.copy-code{position:absolute;right:.5em;top:.5em;cursor:pointer;color:#c1c7cd}.post-content pre .iconpark-icon{width:16px;height:16px;margin:3px}.post-content pre .iconpark-icon:hover{color:var(--link-hover-color)}.dark-layout .post-content pre code.hljs{padding:1em!important}`;

const mark = new WeakSet();
const addCopyBtn = (els, ctx) => {
    els.forEach(code => {
        if (mark.has(code)) return;
        mark.add(code);
        const btn = document.createElement("span");
        btn.className = "copy-code";
        btn.title = "复制代码";
        btn.innerHTML = `<svg class="iconpark-icon"><use href="#copy"></use></svg>`;
        btn.onclick = () => {
            const sel = getSelection(), range = document.createRange();
            range.selectNodeContents(code);
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand("copy");
            sel.removeAllRanges();
            btn.querySelector("use")?.setAttribute("href", "#check");
            setTimeout(() => btn.querySelector("use")?.setAttribute("href", "#copy"), 1000);
            ctx.ui.tips?.("复制成功", btn, { tips: 4, time: 1000 });
        };
        code.after(btn);
    });
};

export default {
    id: "codeHighlight",
    deps: ["ui"],
    order: 140,
    cfg: { code_highlight: { enabled: true } },
    meta: { code_highlight: { label: "代码高亮", group: "内容设置" } },
    match: ctx => ctx.store.get("code_highlight.enabled", true),
    init(ctx) {
        addStyle("nsx-hl-css", CSS);
        addCopyBtn($$(".post-content pre code"), ctx);
    },
    watch: ctx => ({ sel: ".post-content pre code", fn: els => addCopyBtn(els, ctx), opts: { debounce: 80 } })
};
