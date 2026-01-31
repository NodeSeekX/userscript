// NSX App - 启动器
import { env, $, $$, store, addStyle, addScript, define, boot, debounce, net } from "./core.js";

// ===== SVG 图标 =====
const SVG_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
<symbol id="copy" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672M7.813 13h24.374A2.813 2.813 0 0 1 35 15.813v24.374A2.813 2.813 0 0 1 32.188 43H7.813A2.813 2.813 0 0 1 5 40.188V15.813A2.813 2.813 0 0 1 7.813 13Z"/></symbol>
<symbol id="check" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m4 24 5-5 10 10L39 9l5 5-25 25L4 24Z"/></symbol>
<symbol id="history" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M5.818 6.727V14h7.273"/><path d="M4 24c0 11.046 8.954 20 20 20s20-8.954 20-20S35.046 4 24 4c-7.32 0-13.715 3.932-17.192 9.8"/><path d="M24 12v14l9.33 9.33"/></g></symbol>
<symbol id="comments" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path d="M44 6H4v30h8.5v7l9-7H44V6Z"/><path stroke-linecap="round" d="M14 19.5h20M14 27.5h12"/></g></symbol>
<symbol id="at-sign" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4 4 12.954 4 24s8.954 20 20 20"/><path d="M32 24c0 4.418-3.582 10-8 10s-8-5.582-8-10 3.582-8 8-8 8 3.582 8 8m0 0v10c0 3 3 6 6 6"/></g></symbol>
<symbol id="envelope-one" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M4 39h40V9H4z"/><path d="m4 9 20 15L44 9"/></g></symbol>
<symbol id="remind-6nce9p47" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M24 44c1.387 0 2.732-.123 4.023-.357M44 24a20 20 0 0 0-40 0c0 4.59 1.55 8.82 4.157 12.194L4 44l7.806-4.157A19.9 19.9 0 0 0 24 44a20 20 0 0 0 4.023-.357"/><path d="M33.805 40a6 6 0 1 0 5.857-9.805"/></g></symbol>
<symbol id="down" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m36 18-12 12-12-12"/></symbol>
</svg>`;

// ===== 基础 CSS =====
const BASE_CSS = `.blocked-post{display:none!important}#back-to-comment{display:flex}#fast-nav-button-group .nav-item-btn:nth-last-child(4){bottom:120px}header div.history-dropdown-on{color:var(--link-hover-color);cursor:pointer;padding:0 5px;position:absolute;right:50px}.msc-overlay{background-color:var(--bg-sub-color)}`;

// ===== Observer =====
class Observer {
    constructor() { this.listeners = []; this.mo = null; }
    watch(sel, fn, opts = {}) {
        this.listeners.push({ sel, fn, opts });
        if (!this.mo) {
            this.mo = new MutationObserver(debounce(() => this._run(), 50));
            this.mo.observe(document.body, { childList: true, subtree: true });
        }
    }
    _run() {
        this.listeners.forEach(({ sel, fn, opts }) => {
            const els = $$(sel);
            if (els.length) fn(els, opts);
        });
    }
}

// ===== 创建 ctx =====
function createCtx(obs) {
    const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    return {
        env, $, $$, addStyle, store, net,
        uw,
        get loggedIn() { return !!uw?.__config__?.user; },
        get user() { return uw?.__config__?.user; },
        get uid() { return uw?.__config__?.user?.member_id; },
        site: env.site,
        isPost: /^\/post-/.test(location.pathname),
        isList: /^\/(categories\/|page|award|search|$)/.test(location.pathname),
        watch: obs.watch.bind(obs),
        ui: {}
    };
}

// ===== 启动 =====
export function start() {
    // 注入资源
    document.body?.insertAdjacentHTML("beforeend", SVG_SPRITE);
    addStyle("nsx-base", BASE_CSS);
    // layui CSS
    addStyle("nsx-layui-css", "https://s.cfn.pp.ua/layui/2.10.3/css/layui.css");
    addStyle("nsx-layui-dark", "https://s.cfn.pp.ua/layui/theme-dark/2.10.3/css/layui-theme-dark-selector.css");

    // highlight.js 脚本
    addScript("nsx-hljs-script", "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/highlight.min.js");
    // highlight.js 样式
    addStyle("hightlight-style", GM_getResourceURL("highlightStyle"));
    // hljs 初始化
    addScript("nsx-hljs-onload", `(()=>{const r=()=>{if(window.hljs&&typeof hljs.highlightAll==="function")hljs.highlightAll()};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);

    // 加载模块
    const mods = import.meta.glob("./features/*.js", { eager: true });
    Object.values(mods).forEach(m => m.default && define(m.default));

    // 创建 Observer & ctx
    const obs = new Observer();
    const ctx = createCtx(obs);

    // 初始化 UI (依赖 layui)
    const initUI = () => {
        if (!window.layui?.layer) return (ctx.ui = {});
        const layer = window.layui.layer, uw = ctx.uw;
        ctx.ui = {
            layer,
            toast: (text, style) => { const idx = layer.msg(text, { offset: 't', area: ['100%', 'auto'], anim: 'slideDown' }); layer.style(idx, Object.assign({ opacity: 0.9 }, style)); return idx; },
            info: msg => ctx.ui.toast(msg, { "background-color": "#4D82D6" }),
            success: msg => ctx.ui.toast(msg, { "background-color": "#57BF57" }),
            warning: msg => ctx.ui.toast(msg, { "background-color": "#D6A14D" }),
            error: msg => ctx.ui.toast(msg, { "background-color": "#E1715B" }),
            alert: (t, c, fn) => uw?.mscAlert ? (c === undefined ? uw.mscAlert(t) : uw.mscAlert(t, c)) : layer.alert(c, { title: t, icon: 0, btn: ["确定"] }, fn),
            confirm: (t, c, y, n) => uw?.mscConfirm ? uw.mscConfirm(t, c, y, n) : layer.confirm(c, { title: t, icon: 0, btn: ["确定", "取消"] }, y, n),
            tips: (msg, el, opts) => layer.tips(msg, el, opts)
        };
    };
    initUI();
    if (!ctx.ui.layer) {
        const timer = setInterval(() => { if (window.layui?.layer) { initUI(); clearInterval(timer); } }, 100);
        setTimeout(() => clearInterval(timer), 5000);
    }

    // 启动所有模块
    boot(ctx);
}
