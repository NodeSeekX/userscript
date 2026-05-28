// 代码高亮
import { addScript } from "../core.js";

export default {
    id: "codeHighlight",
    order: 140,
    cfg: { code_highlight: { enabled: true } },
    meta: { code_highlight: { label: "代码高亮", group: "内容设置" } },
    match: ctx => ctx.store.get("code_highlight.enabled", true),
    init(ctx) {
        // 挂载 highlight.js
        addScript("nsx-hljs-script", "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/highlight.min.js");
        addScript("nsx-hljs-onload", `(()=>{const r=()=>{if(window.hljs&&typeof hljs.highlightAll==="function")hljs.highlightAll()};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`)
    },
    watch: ctx => ({ sel: ".post-content pre code", fn: els => els.forEach(el => ctx.uw.hljs?.highlightElement(el)), opts: { debounce: 80 } })
};
