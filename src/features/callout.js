// Callout 支持 + 编辑器插入菜单
import { addStyle, $, $$ } from "../core.js";

const CSS_RENDER = `.post-content blockquote{border-left:none;border-radius:4px;margin:1em 0;box-shadow:inset 4px 0 0 0 rgba(0,0,0,.1)}.callout{--c:8,109,221;overflow:hidden;border-radius:4px;margin:1em 0;padding:12px 12px 12px 24px!important;box-shadow:inset 4px 0 0 0 rgba(var(--c),.5)}.callout.is-collapsible .callout-title{cursor:pointer}.callout-title{display:flex;gap:4px;color:rgb(var(--c));line-height:1.3;align-items:flex-start}.callout-content{overflow-x:auto}.callout-icon{flex:0 0 auto;display:flex;align-items:center}.callout-icon .svg-icon,.callout-fold .svg-icon{color:rgb(var(--c));height:18px;width:18px}.callout-title-inner{font-weight:600}.callout-fold{display:flex;align-items:center;padding-inline-end:8px}.callout-fold .svg-icon{transition:transform .1s}.callout-fold.is-collapsed .svg-icon{transform:rotate(-90deg)}.callout.is-collapsed .callout-content{display:none}.callout[data-callout="abstract"],.callout[data-callout="summary"],.callout[data-callout="tldr"]{--c:83,223,221}.callout[data-callout="info"],.callout[data-callout="todo"]{--c:8,109,221}.callout[data-callout="tip"],.callout[data-callout="hint"],.callout[data-callout="important"]{--c:83,223,221}.callout[data-callout="success"],.callout[data-callout="check"],.callout[data-callout="done"]{--c:68,207,110}.callout[data-callout="question"],.callout[data-callout="help"],.callout[data-callout="faq"]{--c:236,117,0}.callout[data-callout="warning"],.callout[data-callout="caution"],.callout[data-callout="attention"]{--c:236,117,0}.callout[data-callout="failure"],.callout[data-callout="fail"],.callout[data-callout="missing"]{--c:233,49,71}.callout[data-callout="danger"],.callout[data-callout="error"]{--c:233,49,71}.callout[data-callout="bug"]{--c:233,49,71}.callout[data-callout="example"]{--c:120,82,238}.callout[data-callout="quote"],.callout[data-callout="cite"]{--c:158,158,158}`;
const CSS_COLORFUL = `.callout{background:rgba(var(--c),.1)}`;
const CSS_EDITOR = `.callout-inserter-wrapper{position:relative;display:inline-flex;align-items:center}.callout-inserter-btn{padding:0;border:none;background:0 0;cursor:pointer;display:flex;color:currentColor}.callout-inserter-btn:hover{opacity:.7}.callout-inserter-dropdown{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:1000;min-width:160px;display:none;overflow:auto;max-height:240px}.callout-inserter-dropdown.show{display:block}.callout-inserter-item{padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;transition:background .15s}.callout-inserter-item:hover{background:#f5f5f5}.callout-inserter-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}`;

const ICONS = { note: "M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5zm-6.17-1.81 4 4", abstract: "M8 2h8v4H8zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01", info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14v-4m0-4h.01", tip: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4", success: "M20 6 9 17l-5-5", question: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01", warning: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4m0 4h.01", failure: "M18 6 6 18M6 6l12 12", danger: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z", bug: "M12 20v-9m2-6a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4zM14.12 3.88 16 2M8 2l1.88 1.88M9 7.13V6a3 3 0 1 1 6 0v1.13", example: "M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13", quote: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2zM5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z", fold: "m6 9 6 6 6-6" };
const TYPE_MAP = { summary: "abstract", tldr: "abstract", hint: "tip", important: "tip", check: "success", done: "success", help: "question", faq: "question", caution: "warning", attention: "warning", fail: "failure", missing: "failure", error: "danger", cite: "quote" };
const MENUS = [{ k: "note", n: "笔记", c: "8,109,221" }, { k: "info", n: "信息", c: "8,109,221" }, { k: "tip", n: "提示", c: "83,223,221" }, { k: "warning", n: "警告", c: "236,117,0" }, { k: "danger", n: "危险", c: "233,49,71" }, { k: "success", n: "成功", c: "68,207,110" }, { k: "question", n: "问题", c: "236,117,0" }, { k: "example", n: "示例", c: "120,82,238" }];
const svg = d => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="${d}"/></svg>`;
const RE = /^\[!(\w+)\]([+-])?(?:\s+([^<\n]+))?(?:<br\s*\/?>)?([\s\S]*)$/i;

const render = (els) => {
    els.forEach(bq => {
        if (bq.classList.contains("oc-done") || bq.closest("blockquote.oc-done")) return;
        bq.classList.add("oc-done");
        const p = bq.querySelector(":scope > p");
        const m = (p?.innerHTML?.trim() || "").match(RE);
        if (!m) return;
        const [, type, fold, title, content] = m;
        const t = type.toLowerCase(), base = TYPE_MAP[t] || t, icon = ICONS[base] || ICONS.note;
        const isColl = fold === "+" || fold === "-", isCol = fold === "-";
        const wrap = document.createElement("div");
        wrap.className = `callout${isColl ? " is-collapsible" : ""}${isCol ? " is-collapsed" : ""}`;
        wrap.dataset.callout = t;
        const titleEl = document.createElement("div");
        titleEl.className = "callout-title";
        titleEl.innerHTML = `<div class="callout-icon">${svg(icon)}</div><div class="callout-title-inner">${title?.trim() || type[0].toUpperCase() + type.slice(1)}</div>`;
        if (isColl) {
            const foldEl = document.createElement("div");
            foldEl.className = `callout-fold${isCol ? " is-collapsed" : ""}`;
            foldEl.innerHTML = svg(ICONS.fold);
            titleEl.appendChild(foldEl);
            titleEl.onclick = () => { wrap.classList.toggle("is-collapsed"); foldEl.classList.toggle("is-collapsed"); };
        }
        wrap.appendChild(titleEl);
        const cont = document.createElement("div");
        cont.className = "callout-content";
        if (content?.trim()) { const pp = document.createElement("p"); pp.innerHTML = content.trim(); cont.appendChild(pp); }
        let sib = p.nextSibling;
        while (sib) { const next = sib.nextSibling; cont.appendChild(sib); sib = next; }
        if (cont.childNodes.length) wrap.appendChild(cont);
        bq.replaceWith(wrap);
    });
};

const insertCallout = (editor, type) => {
    const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
    if (!cm) return;
    const doc = cm.getDoc();
    let cur = doc.getCursor();
    const lvl = (doc.getLine(cur.line).match(/^(>\s*)+/)?.[0].match(/>/g) || []).length;
    if (lvl > 0) {
        let last = cur.line;
        for (let i = cur.line + 1; i < doc.lineCount(); i++) { if (doc.getLine(i).match(/^>\s*/)) last = i; else break; }
        cur = { line: last, ch: doc.getLine(last).length };
    }
    const pre = lvl > 0 ? ">".repeat(lvl + 1) + " " : "> ";
    doc.replaceRange((lvl > 0 ? "\n" : "") + `${pre}[!${type}] \n${pre}`, cur);
    doc.setCursor({ line: cur.line + (lvl > 0 ? 1 : 0), ch: `${pre}[!${type}] `.length });
    cm.focus();
};

let clickBound = false;
const createInserter = () => {
    const editor = $(".md-editor");
    const bar = editor?.querySelector(".mde-toolbar");
    if (!editor || !bar || bar.querySelector(".callout-inserter-wrapper")) return;

    const vAttr = [...(bar.querySelector(".toolbar-item")?.attributes || [])].find(a => a.name.startsWith("data-v-"))?.name;
    const setV = el => vAttr && el.setAttribute(vAttr, "");

    const wrap = document.createElement("span");
    wrap.className = "callout-inserter-wrapper toolbar-item";
    wrap.title = "Callout - NodeSeek X";
    setV(wrap);

    const btn = document.createElement("span");
    btn.className = "callout-inserter-btn i-icon";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M44 8H4v30h15l5 5 5-5h15V8Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 18v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="33" r="2" fill="currentColor"/></svg>`;
    setV(btn);

    const drop = document.createElement("div");
    drop.className = "callout-inserter-dropdown";
    MENUS.forEach(t => {
        const item = document.createElement("div");
        item.className = "callout-inserter-item";
        item.innerHTML = `<span class="callout-inserter-dot" style="background:rgb(${t.c})"></span>${t.n}[${t.k}]`;
        item.onclick = e => { e.stopPropagation(); insertCallout(editor, t.k); drop.classList.remove("show"); };
        drop.appendChild(item);
    });

    btn.onclick = e => { e.stopPropagation(); drop.classList.toggle("show"); };
    if (!clickBound) { document.addEventListener("click", () => $$(".callout-inserter-dropdown.show").forEach(d => d.classList.remove("show"))); clickBound = true; }

    const sep = document.createElement("div");
    sep.className = "sep";
    setV(sep);
    wrap.append(btn, drop);
    bar.append(sep, wrap);
};

export default {
    id: "callout",
    order: 360,
    cfg: {
        callout: {
            enabled: true,
            render: true,
            editor: true,
            style: "colorful"
        }
    },
    meta: {
        callout: {
            label: "Callout 支持",
            group: "内容设置",
            fields: {
                render: { type: "SWITCH", label: "正文渲染" },
                editor: { type: "SWITCH", label: "编辑器按钮" },
                style: { type: "RADIO", label: "渲染风格", options: [{ value: "colorful", text: "绚丽" }, { value: "clean", text: "清新" }] }
            }
        }
    },
    match: ctx => (ctx.isPost || /^\/new-discussion/.test(location.pathname)) && ctx.store.get("callout.enabled", true) && (ctx.store.get("callout.render", true) || ctx.store.get("callout.editor", true)),
    init(ctx) {
        if (ctx.store.get("callout.render", true)) {
            const style = ctx.store.get("callout.style", "colorful");
            addStyle("nsx-callout-render", CSS_RENDER + (style === "colorful" ? CSS_COLORFUL : ""));
            render($$(".post-content blockquote"));
        }
        if (ctx.store.get("callout.editor", true)) {
            addStyle("nsx-callout-editor", CSS_EDITOR);
            createInserter();
            document.addEventListener("click", e => { if (e.target?.closest?.(".md-editor")) requestAnimationFrame(createInserter); });
        }
    },
    watch: ctx => {
        const w = [];
        if (ctx.store.get("callout.render", true)) {
            w.push({ sel: ".post-content blockquote", fn: render, opts: { debounce: 80 } });
        }
        if (ctx.store.get("callout.editor", true)) {
            w.push({ sel: ".mde-toolbar", fn: createInserter, opts: { debounce: 80 } });
        }
        return w;
    }
};
