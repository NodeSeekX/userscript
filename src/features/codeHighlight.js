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
        addScript("nsx-hljs-onload", `(()=>{const r=()=>{if(window.hljs){document.querySelectorAll('.post-content pre code').forEach(el=>{if(el.classList.contains('language-mermaid'))return;const s=el.querySelector('span');if(s&&Array.from(s.classList).some(c=>c.startsWith('hljs-')))return;try{window.hljs.highlightElement(el)}catch(e){}})}};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);

        // 挂载 mermaid.js
        addScript("nsx-mermaid-script", "https://s4.zstatic.net/ajax/libs/mermaid/11.15.0/mermaid.min.js");
        addScript("nsx-mermaid-onload", `(()=>{const r=()=>{if(window.mermaid){mermaid.initialize({startOnLoad:false,theme:'default'});const nodes=document.querySelectorAll('.language-mermaid');if(nodes.length)mermaid.run({nodes})}};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);
    },
    watch: ctx => ({
        sel: ".post-content pre code",
        fn: els => {
            const mermaidEls = [];
            els.forEach(el => {
                console.log('hihg-watch');
                if (el.classList.contains("language-mermaid")) {
                    mermaidEls.push(el);
                } else {
                    // 判断第1个 span 元素是否存在 hljs- 开头的 class
                    const firstSpan = el.querySelector("span");
                    const isHighlighted = firstSpan && Array.from(firstSpan.classList).some(c => c.startsWith("hljs-"));
                    if (!isHighlighted) {
                        ctx.uw.hljs?.highlightElement(el);
                    }
                }
            });
            if (mermaidEls.length > 0 && ctx.uw.mermaid) {
                try {
                    ctx.uw.mermaid.run({ nodes: mermaidEls });
                } catch (e) {
                    console.error("Mermaid run error:", e);
                }
            }
        },
        opts: { debounce: 80 }
    })
};
