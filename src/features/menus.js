// 菜单系统（油猴菜单 + 高级设置面板）
import { store, addStyle } from "../core.js";

const CSS = `#nsx-config-menu{height:100%;overflow-y:visible;border-right:1px solid #eee}#nsx-config-content{height:100%;overflow-y:auto;padding:0 15px;background:#f8f8f8}.nsx-config-card{margin-bottom:20px}.nsx-config-card .layui-card-header{display:flex;align-items:center;justify-content:space-between;font-weight:700}.nsx-config-card .header-checkbox{position:absolute;right:15px;top:50%;transform:translateY(-50%)}.nsx-config-card .layui-form-switch{margin-top:0!important}.nsx-config-card .layui-card-body:empty{padding-top:0;padding-bottom:0}.dark-layout #nsx-config-menu{border-right-color:#3a3a3a}.dark-layout #nsx-config-content{background:#1e1e1e}`;

const el = (t, c, p, s) => { const e = document.createElement(t); if (c) e.className = c; if (s) e.style.cssText = s; if (p) p.appendChild(e); return e; };

export default {
    id: "menus",
    deps: ["ui"],
    order: 30,
    cfg: { open_post_in_new_tab: { enabled: false } },
    meta: { open_post_in_new_tab: { label: "新标签页打开帖子", group: "内容设置" } },
    match: () => true,
    init(ctx) {
        const uw = ctx.uw, code = ctx.site?.code || "ns";
        const ids = [];
        const txt = (m, v) => `${m.text}: ${m.states[v].s1} ${m.states[v].s2}`;


        const regMenus = () => {
            ids.splice(0).forEach(i => GM_unregisterMenuCommand(i));
            menus.forEach(m => {
                let lbl = m.text;
                if (m.states.length > 0) {
                    let v = 0;
                    if (m.name === "sign_in") v = store.get(`sign_in.${code}.method`, 0);
                    else v = store.get(`${m.name}.enabled`, true) === false ? 0 : 1;
                    lbl = txt(m, v);
                }
                const id = GM_registerMenuCommand(lbl, () => m.cb(m.name, m.states), { autoClose: m.autoClose ?? true });
                ids.push(id || lbl);
            });
        };

        const switchState = (n, states) => {
            if (n === "sign_in") {
                if (!ctx.site) return;
                let cur = store.get(`sign_in.${code}.method`, 0);
                cur = (cur + 1) % states.length;
                store.set(`sign_in.${code}.enabled`, cur !== 0);
                store.set(`sign_in.${code}.method`, cur || 1);
            } else if (n === "loading_post") {
                const next = !store.get("loading_post.enabled", true);
                store.set("loading_post.enabled", next);
                store.set("loading_comment.enabled", next);
            } else {
                store.set(`${n}.enabled`, !store.get(`${n}.enabled`, true));
            }
            regMenus();
        };

        const reSign = () => {
            if (!ctx.loggedIn || store.get(`sign_in.${code}.enabled`, true) === false) return ctx.ui.alert("提示", "签到已关闭");
            store.set(`sign_in.${code}.last_date`, "1753/1/1");
            location.reload();
        };

        const switchNewTab = () => {
            const next = !store.get("open_post_in_new_tab.enabled", false);
            try {
                uw.indexedDB.open("ns-preference-db").onsuccess = e => {
                    const db = e.target.result;
                    const s = db.transaction("ns-preference-store", "readwrite").objectStore("ns-preference-store");
                    s.get("configuration").onsuccess = e2 => {
                        const c = e2.target.result || {};
                        c.openPostInNewPage = next;
                        s.put(c, "configuration");
                        store.set("open_post_in_new_tab.enabled", next);
                        regMenus();
                        ctx.ui.alert("", `已${next ? "开启" : "关闭"}新标签页打开链接`);
                    };
                };
            } catch { }
        };

        const advSettings = () => {
            if (!ctx.ui.layer || !window.layui) return;
            addStyle("nsx-cfg", CSS);

            // 获取所有模块的 cfg 和 meta
            const defs = store.getDefaults(), metas = store.getMeta();
            const ignore = new Set(["version", "debug", "ui"]);
            const entries = Object.entries(metas).filter(([k]) => defs[k] && !ignore.has(k)).map(([k, m]) => ({ key: k, meta: m }));
            const groups = {};
            entries.forEach(e => { const g = e.meta.group || "其他设置"; (groups[g] ||= []).push(e); });

            const cont = document.createElement("div");
            cont.className = "layui-row";
            cont.style.cssText = "display:flex;height:100%";
            const menuDiv = el("div", "layui-panel layui-col-xs3", cont);
            menuDiv.id = "nsx-config-menu";
            const menuList = el("ul", "layui-menu", menuDiv);
            const wrapper = el("div", "layui-col-xs9", cont);
            wrapper.id = "nsx-config-content";

            const isObj = v => v && typeof v === "object" && !Array.isArray(v);
            const inferType = (v, m) => m?.type || (Array.isArray(v) ? "TEXTAREA" : typeof v === "boolean" ? "SWITCH" : typeof v === "number" ? "NUMBER" : "TEXT");
            const inferVT = (v, m) => m?.valueType || (Array.isArray(v) ? "array" : typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : "string");

            const makeField = (f, path, val, defaultCol = 12) => {
                const col = f.col ?? defaultCol;
                const w = el("div", `layui-col-md${col}`), item = el("div", "layui-form-item", w);
                const lbl = el("label", "layui-form-label", item); lbl.textContent = f.label || f.key;
                const blk = el("div", "layui-input-block", item);
                let inp;
                if (f.type === "SWITCH") { inp = el("input", "", blk); inp.type = "checkbox"; if (val) inp.setAttribute("checked", ""); inp.setAttribute("lay-skin", "switch"); inp.setAttribute("lay-text", "开启|关闭"); inp.name = path; }
                else if (f.type === "TEXTAREA") { inp = el("textarea", "layui-textarea", blk); inp.setAttribute("placeholder", f.placeholder || ""); inp.textContent = Array.isArray(val) ? val.join("\n") : (val ?? ""); inp.name = path; }
                else if (f.type === "RADIO" && f.options) {
                    f.options.forEach(opt => {
                        const r = el("input", "", blk); r.type = "radio"; r.name = path; r.setAttribute("value", opt.value);
                        r.dataset.valueType = f.valueType || "";
                        if (String(val) === String(opt.value)) r.setAttribute("checked", "");
                        r.setAttribute("title", opt.text);
                    });
                    inp = blk.querySelector("input");
                }
                else if (f.type === "COLOR") {
                    const inpWrap = el("div", "layui-input-inline", blk); inpWrap.style.width = "100px";
                    inp = el("input", "layui-input", inpWrap); inp.type = "text"; inp.name = path; inp.value = val ?? ""; inp.readOnly = true;
                    inp.style.cssText = `background:${val || "#fff"};cursor:pointer;color:transparent`;
                    const cpWrap = el("div", "layui-inline", blk); cpWrap.style.left = "-11px";
                    const wrap = el("div", "", cpWrap);
                    wrap.dataset.colorPath = path; wrap.dataset.colorVal = val ?? ""; wrap.dataset.colorInp = inp.name; wrap.dataset.colorDefault = f.defaultVal ?? "";
                }
                else { inp = el("input", "layui-input", blk); inp.type = f.type === "NUMBER" ? "number" : "text"; inp.setAttribute("value", val ?? ""); inp.name = path; }
                if (inp) inp.dataset.valueType = f.valueType || "";
                return w;
            };

            const makeCard = (entry, siteCode) => {
                const m = entry.meta || {};
                let base = entry.key, cfg = defs[entry.key];
                if (entry.key === "sign_in") { cfg = defs.sign_in?.[siteCode] || defs.sign_in?.ns || {}; base = `sign_in.${siteCode}`; }
                if (!isObj(cfg)) return null;
                const card = el("div", "layui-card layui-form nsx-config-card");
                card.setAttribute("lay-filter", `nsx-${entry.key}`);
                const hdr = el("div", "layui-card-header", card); hdr.textContent = m.label || entry.key;
                if (typeof cfg.enabled === "boolean") {
                    const cbW = el("div", "header-checkbox", hdr), cb = el("input", "", cbW);
                    cb.type = "checkbox"; cb.name = `${base}.enabled`; if (store.get(`${base}.enabled`, cfg.enabled)) cb.setAttribute("checked", "");
                    cb.setAttribute("lay-skin", "switch"); cb.setAttribute("lay-text", "开启|关闭");
                    cb.setAttribute("lay-filter", "nsx-main-switch");
                }
                const body = el("div", "layui-card-body layui-row layui-col-space10", card);
                const fields = m.fields || {}, hidden = new Set(m.hidden || []);
                const cols = m.cols || 1, defaultCol = Math.floor(12 / cols);
                Object.keys(cfg).filter(k => k !== "enabled" && !isObj(cfg[k]) && !hidden.has(k)).forEach(k => {
                    const fm = fields[k] || {};
                    const f = { key: k, label: fm.label || k, type: inferType(cfg[k], fm), options: fm.options, placeholder: fm.placeholder, valueType: inferVT(cfg[k], fm), col: fm.col, defaultVal: cfg[k] };
                    const cur = store.get(`${base}.${k}`, cfg[k]);
                    const fe = makeField(f, `${base}.${k}`, cur, defaultCol);
                    if (fe) body.appendChild(fe);
                });
                return card;
            };

            Object.entries(groups).forEach(([g, list], i) => {
                const fs = el("fieldset", "layui-elem-field layui-field-title", wrapper); fs.id = `group-${i}`;
                const lg = el("legend", "", fs); lg.textContent = g;
                const fd = el("div", "layui-form", wrapper);
                list.forEach(e => { const c = makeCard(e, code); if (c) fd.appendChild(c); });
                const mi = el("li", "", menuList); if (i === 0) mi.classList.add("layui-menu-item-checked");
                const mb = el("div", "layui-menu-body-title", mi), a = el("a", "", mb); a.href = `#group-${i}`; a.textContent = g;
            });

            // 底部提示
            const endFs = el("fieldset", "layui-elem-field layui-field-title", wrapper, "text-align:center");
            const endLg = el("legend", "", endFs, "font-size:0.8em;opacity:0.5");
            endLg.textContent = "到底了";

            const w = window.layui.device().mobile ? "100%" : "620px";
            ctx.ui.layer.open({
                type: 1, offset: "r", anim: "slideLeft", area: [w, "100%"], scrollbar: false, shade: 0.1, shadeClose: false,
                btn: ["保存设置", "取消"], btnAlign: "r", title: "NodeSeek X 设置", id: "setting-layer-direction-r", content: cont.outerHTML,
                success: ly => {
                    const r = ly?.[0] || ly;
                    try { window.layui.form?.render(); } catch { }
                    // 滚动同步：右侧滚动时高亮左侧菜单
                    const content = r?.querySelector?.("#nsx-config-content");
                    const menu = r?.querySelector?.("#nsx-config-menu");
                    if (content && menu) {
                        const items = menu.querySelectorAll("li");
                        content.addEventListener("scroll", () => {
                            const groups = content.querySelectorAll("fieldset[id^='group-']");
                            let activeIdx = 0;
                            groups.forEach((g, i) => { if (g.offsetTop - content.scrollTop <= 50) activeIdx = i; });
                            items.forEach((li, i) => li.classList.toggle("layui-menu-item-checked", i === activeIdx));
                        }, { passive: true });
                    }
                    // 主开关联动
                    const toggleCard = (card, on) => {
                        card.querySelectorAll(".layui-card-body input,.layui-card-body select,.layui-card-body textarea").forEach(el => {
                            el.disabled = !on;
                            el.closest(".layui-form-item")?.classList.toggle("layui-disabled", !on);
                        });
                        window.layui.form?.render(null, card.getAttribute("lay-filter"));
                    };
                    // 初始 + 监听
                    r?.querySelectorAll?.(".header-checkbox input").forEach(cb => !cb.checked && toggleCard(cb.closest(".nsx-config-card"), false));
                    window.layui.form?.on("switch(nsx-main-switch)", d => toggleCard(d.elem.closest(".nsx-config-card"), d.elem.checked));
                    window.layui.use("colorpicker", () => {
                        const cp = window.layui.colorpicker;
                        r?.querySelectorAll?.("[data-color-path]").forEach(wrap => {
                            const inp = r.querySelector(`input[name="${wrap.dataset.colorInp}"]`), init = wrap.dataset.colorVal || "", def = wrap.dataset.colorDefault || "";
                            const setBg = c => { if (inp) inp.style.background = c || ""; };
                            const render = color => cp.render({ elem: wrap, color, alpha: true, predefine: true, format: "rgb", change: setBg, done(c) { if (inp) inp.value = c || def; if (!c && def) { render(def); setBg(def); } }, cancel: setBg });
                            render(init);
                        });
                    });
                },
                yes: (idx, ly) => {
                    const r = ly?.[0] || ly, sc = r?.querySelector ? r : document;
                    sc.querySelectorAll("input,select,textarea").forEach(el => {
                        if (!el.name) return;
                        // radio 只保存选中的那个
                        if (el.type === "radio" && !el.checked) return;
                        let v;
                        const vt = el.dataset.valueType;
                        if (el.type === "checkbox") v = el.checked;
                        else if (el.type === "radio") v = vt === "number" ? Number(el.value) : el.value;
                        else if (el.tagName === "TEXTAREA") v = vt === "array" ? el.value.split("\n").map(s => s.trim()).filter(Boolean) : el.value;
                        else if (el.type === "number" || vt === "number") { const n = Number(el.value); v = Number.isFinite(n) ? n : 0; }
                        else v = el.value;
                        if (v !== undefined && v !== "") store.set(el.name, v);
                    });
                    ctx.ui.layer.msg("设置已保存，刷新生效");
                    ctx.ui.layer.close(idx);
                }
            });
        };

        const menus = [
            { name: "sign_in", cb: switchState, text: "自动签到", states: [{ s1: "❌", s2: "关闭" }, { s1: "🎲", s2: "随机🍗" }, { s1: "📌", s2: "5个🍗" }] },
            { name: "re_sign", cb: reSign, text: "🔂 重试签到", states: [] },
            { name: "loading_post", cb: switchState, text: "下拉加载翻页", states: [{ s1: "❌", s2: "关闭" }, { s1: "✅", s2: "开启" }] },
            { name: "open_post_in_new_tab", cb: switchNewTab, text: "新标签页打开帖子", states: [{ s1: "❌", s2: "关闭" }, { s1: "✅", s2: "开启" }] },
            { name: "advanced_settings", cb: advSettings, text: "⚙️ 高级设置", states: [] },
            { name: "feedback", cb: () => GM_openInTab("https://greasyfork.org/zh-CN/scripts/479426/feedback", { active: true, insert: true, setParent: true }), text: "💬 反馈 & 建议", states: [] }
        ];

        regMenus();
    }
};
