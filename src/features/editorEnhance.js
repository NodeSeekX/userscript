// 编辑器增强 (Callout / Tabs / Details / 快捷键)
import { addStyle, $, $$ } from "../core.js";

const CSS = `.nsx-ee-btn{position:relative;display:inline-flex;align-items:center}.nsx-ee-btn>span.i-icon{padding:0;border:none;background:0 0;cursor:pointer;display:flex;color:currentColor}.nsx-ee-btn>span.i-icon:hover{opacity:.7}.nsx-ee-drop{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:1000;min-width:140px;display:none;background:var(--bg-color,#fff);border:1px solid var(--border-color,#eee);overflow:hidden}.nsx-ee-drop.show{display:block}.nsx-ee-item{display:flex;align-items:stretch;font-size:13px;border-bottom:1px solid var(--border-color,#eee);transition:background .15s}.nsx-ee-item:last-child{border-bottom:none}.nsx-ee-main{padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;flex:1}.nsx-ee-item:hover{background:rgba(128,128,128,.1)}.nsx-ee-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.nsx-ee-actions{display:flex;align-items:stretch;border-left:1px solid var(--border-color,#eee)}.nsx-ee-act{padding:0 10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:14px;transition:background .15s}.nsx-ee-act:hover{background:rgba(128,128,128,.1)}`;

const SVG_CALLOUT = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M44 8H4v30h15l5 5 5-5h15V8Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 18v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="33" r="2" fill="currentColor"/></svg>`;
const SVG_LAYOUT = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4L4 14v20l20 10 20-10V14L24 4z"/><path d="M4 14l20 10 20-10M24 24v20"/></svg>`;

const CALLOUT_MENUS = [
    { k: "note", n: "笔记", c: "9,105,218" },
    { k: "tip", n: "提示", c: "26,127,55" },
    { k: "important", n: "重要", c: "130,80,223" },
    { k: "warning", n: "警告", c: "154,103,0" },
    { k: "caution", n: "注意", c: "207,34,46" }
];
const LAYOUT_MENUS = [
    { k: "details", n: "通用折叠" },
    { k: "tabs", n: "Tabs 面板" }
];

const insertText = (editor, action, type, fold = "") => {
    const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
    if (!cm) return;
    const doc = cm.getDoc();
    let cur = doc.getCursor();

    if (action === "callout") {
        const lvl = (doc.getLine(cur.line).match(/^(>\s*)+/)?.[0].match(/>/g) || []).length;
        if (lvl > 0) {
            let last = cur.line;
            for (let i = cur.line + 1; i < doc.lineCount(); i++) { if (doc.getLine(i).match(/^>\s*/)) last = i; else break; }
            cur = { line: last, ch: doc.getLine(last).length };
        }
        const pre = lvl > 0 ? ">".repeat(lvl + 1) + " " : "> ";
        doc.replaceRange((lvl > 0 ? "\n" : "") + `${pre}[!${type}]${fold} \n${pre}`, cur);
        doc.setCursor({ line: cur.line + (lvl > 0 ? 1 : 0) + 1, ch: pre.length });
    } else if (action === "layout") {
        const tpl = type === "details"
            ? `\n::: details 点击展开\n这里是被折叠内容\n:::\n`
            : `\n:::: tabs\n::: tab-item 标签一\n内容一\n:::\n::: tab-item 标签二\n内容二\n:::\n::::\n`;
        const offset = type === "details" ? 2 : 3;
        doc.replaceRange(tpl, cur);
        const targetLine = cur.line + offset;
        doc.setSelection({ line: targetLine, ch: 0 }, { line: targetLine, ch: doc.getLine(targetLine).length });
    }
    cm.focus();
};

const bindShortcut = (editor) => {
    const cmEl = editor.querySelector(".CodeMirror");
    const cm = cmEl?.CodeMirror;
    if (!cm || cm.__nsx) return;
    cm.__nsx = true;

    const getBtn = () => editor.querySelector("button.submit.btn.focus-visible") || document.querySelector(".md-editor button.submit.btn.focus-visible");
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
};

let clickBound = false;
const createInserters = (ctx) => {
    const editor = $(".md-editor");
    if (!editor) return;

    // 绑定快捷键
    if (ctx.store.get("editorEnhance.shortcut", true)) bindShortcut(editor);

    const bar = editor.querySelector(".mde-toolbar");
    if (!bar) return;

    const vAttr = [...(bar.querySelector(".toolbar-item")?.attributes || [])].find(a => a.name.startsWith("data-v-"))?.name;
    const v = vAttr ? ` ${vAttr}=""` : "";

    // 生成 Callout 按钮
    if (ctx.store.get("editorEnhance.callout", true) && !bar.querySelector("[data-toggle='callout']")) {
        bar.insertAdjacentHTML("beforeend", `<div class="sep"${v}></div><span class="nsx-ee-btn toolbar-item"${v} title="Callout - NodeSeek X" data-toggle="callout"><span class="i-icon"${v}>${SVG_CALLOUT}</span>
            <div class="nsx-ee-drop" style="min-width:200px">
                ${CALLOUT_MENUS.map(t => `<div class="nsx-ee-item"><div class="nsx-ee-main" data-action="callout" data-type="${t.k}"><span class="nsx-ee-dot" style="background:rgb(${t.c})"></span>${t.n}[${t.k}]</div><div class="nsx-ee-actions"><div class="nsx-ee-act" data-action="callout" data-type="${t.k}" data-fold="+">+</div><div class="nsx-ee-act" data-action="callout" data-type="${t.k}" data-fold="-">-</div></div></div>`).join("")}
            </div>
        </span>`);
    }

    // 生成 Tabs/Details 按钮
    if (ctx.store.get("editorEnhance.layout", true) && !bar.querySelector("[data-toggle='layout']")) {
        bar.insertAdjacentHTML("beforeend", `<div class="sep"${v}></div><span class="nsx-ee-btn toolbar-item"${v} title="排版语法 (Tabs / 折叠) - NodeSeek X" data-toggle="layout"><span class="i-icon"${v}>${SVG_LAYOUT}</span>
            <div class="nsx-ee-drop">
                ${LAYOUT_MENUS.map(t => `<div class="nsx-ee-item"><div class="nsx-ee-main" data-action="layout" data-type="${t.k}">${t.n}</div></div>`).join("")}
            </div>
        </span>`);
    }

    // 绑定全局委托点击事件（只绑一次）
    if (!clickBound) {
        document.addEventListener("click", e => {
            const toggle = e.target.closest("[data-toggle]");
            const action = e.target.closest("[data-action]");

            // 点击下拉项，执行插入操作
            if (action) {
                const act = action.getAttribute("data-action");
                const type = action.getAttribute("data-type");
                const fold = action.getAttribute("data-fold") || "";

                const curEditor = action.closest(".md-editor") || $(".md-editor");
                if (curEditor) insertText(curEditor, act, type, fold);

                $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
                return;
            }

            // 点击主按钮，切换下拉面板
            if (toggle) {
                const targetDrop = toggle.querySelector(".nsx-ee-drop");
                if (targetDrop) {
                    const isShowing = targetDrop.classList.contains("show");
                    $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
                    if (!isShowing) targetDrop.classList.add("show");
                }
                return;
            }

            // 点击空白处，关闭全部面板
            $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
        });
        clickBound = true;
    }
};

export default {
    id: "editorEnhance",
    order: 360,
    cfg: {
        editorEnhance: {
            enabled: true,
            callout: true,
            layout: true,
            shortcut: true
        }
    },
    meta: {
        editorEnhance: {
            label: "编辑器增强",
            group: "内容设置",
            fields: {
                callout: { type: "SWITCH", label: "Callout" },
                layout: { type: "SWITCH", label: "Tabs/折叠" },
                shortcut: { type: "SWITCH", label: "快捷键发帖" }
            }
        }
    },
    match: ctx => (ctx.isPost || /^\/new-discussion/.test(location.pathname)) && ctx.store.get("editorEnhance.enabled", true) && (ctx.store.get("editorEnhance.callout", true) || ctx.store.get("editorEnhance.layout", true) || ctx.store.get("editorEnhance.shortcut", true)),
    init(ctx) {
        addStyle("nsx-ee", CSS);
        createInserters(ctx);
        document.addEventListener("click", e => { if (e.target?.closest?.(".md-editor")) requestAnimationFrame(() => createInserters(ctx)); });
    },
    watch: ctx => [{ sel: ".md-editor", fn: () => createInserters(ctx), opts: { debounce: 80 } }]
};
