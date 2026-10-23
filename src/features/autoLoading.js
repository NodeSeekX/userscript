// 下拉加载翻页
import { $, $$, net, debounce, throttle, addStyle } from "../core.js";

const PROFILES = {
    list: { path: /^\/(categories\/|page|award|search|$)/, threshold: 1500, next: ".nsk-pager a.pager-next", list: "ul.post-list:not(.topic-carousel-panel)", pagerTop: "div.nsk-pager.pager-top", pagerBot: "div.nsk-pager.pager-bottom" },
    post: { path: /^\/post-/, threshold: 690, next: ".nsk-pager a.pager-next", list: "ul.comments", pagerTop: "div.nsk-pager.post-top-pager", pagerBot: "div.nsk-pager.post-bottom-pager" }
};

export default {
    id: "autoLoading",
    order: 100,
    cfg: { loading_post: { enabled: true }, loading_comment: { enabled: true, nested: false, interval: 800, hide_signature: false } },
    meta: { loading_post: { label: "加载帖子", group: "内容设置" }, loading_comment: { label: "加载评论", group: "内容设置", fields: { nested: { label: "楼中楼" }, interval: { label: "请求间隔", type: "SLIDER", min: 100, max: 1500, step: 100, unit: "ms", valueType: "number", tipsAlways: true, desc: "拉取下一页楼层时的等待时间。调大可防由于请求过快被服务器拦截。" }, hide_signature: { label: "隐藏签名", desc: "隐藏评论区用户的个性签名" } } } },
    match: ctx => ctx.store.get("loading_post.enabled", true) || ctx.store.get("loading_comment.enabled", true),
    init(ctx) {
        if (ctx.isPost && ctx.store.get("loading_comment.hide_signature")) addStyle("nsx-hide-signature", ".content-item > .signature{display:none!important}");

        const profile = (ctx.isList && ctx.store.get("loading_post.enabled", true)) ? PROFILES.list : 
                        (ctx.isPost && ctx.store.get("loading_comment.enabled", true)) ? PROFILES.post : null;
        if (!profile) return;

        let busy = false, prevY = scrollY;

        const blockByLevel = (doc) => {
            const lv = ctx.user?.rank || 0;
            doc.querySelectorAll('.post-list-item use[href="#lock"]').forEach(el => {
                const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
                if (n > lv) el.closest(".post-list-item")?.classList.add("blocked-post");
            });
        };

        const _showCard = (anchor, uid) => {
            const hc = unsafeWindow.hoverCard;
            if (!hc) return;
            if (!hc.$el || !document.body.contains(hc.$el)) {
                hc.setIsHoverCard(true);
                hc.$mount(document.body.appendChild(document.createElement("div")));
            }
            const { left, top } = anchor.getBoundingClientRect();
            Object.assign(hc, { left, top });
            hc.loadUser(uid);
            hc.show();
        };

        const bindPostList = (doc) => {
            doc.querySelectorAll(".post-list .avatar-normal").forEach(n => {
                const uid = +n.dataset.uid;
                if (!isNaN(uid)) n.addEventListener("click", e => { e.preventDefault(); _showCard(n, uid); });
            });
        };

        const bindCommentList = (doc, cfg) => {
            if (!cfg?.postData?.comments) return;
            doc.querySelectorAll(".content-item").forEach((item, i) => {
                const uid = cfg.postData.comments[i]?.poster?.uid;
                const avatar = item.querySelector(".avatar-normal");
                if (uid && avatar) avatar.addEventListener("click", e => { e.preventDefault(); _showCard(avatar, uid); });
            });
        };

        const syncCommentData = (doc) => {
            const json = doc.getElementById("temp-script")?.textContent;
            if (!json) return null;
            try {
                const cfg = JSON.parse(decodeURIComponent(atob(json).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
                if (cfg?.postData?.comments) ctx.uw.__config__.postData.comments.push(...cfg.postData.comments);
                return cfg;
            } catch {
                return null;
            }
        };

        const mountCommentVueComponents = () => {
            const vue = $(".comment-menu")?.__vue__;
            if (!vue) return;
            $$(".content-item").forEach((item, index) => {
                const mp = $(".comment-menu-mount", item);
                if (mp) {
                    const inst = new vue.$root.constructor(vue.$options);
                    inst.setIndex(index);
                    inst.$mount(mp);
                }
            });
        };

        const load = async (force) => {
            if (busy) return;
            if (!force) { const atBottom = document.documentElement.scrollHeight <= innerHeight + scrollY + profile.threshold; if (!atBottom) return; }
            const nextUrl = ctx.$(profile.next)?.href;
            if (!nextUrl) return;

            busy = true;
            try {
                const html = await net.get(nextUrl, {}, "text");
                const doc = new DOMParser().parseFromString(html, "text/html");

                if (ctx.isList) {
                    blockByLevel(doc);
                    bindPostList(doc);
                } else if (ctx.isPost) {
                    const cfg = syncCommentData(doc);
                    bindCommentList(doc, cfg);
                }

                const src = doc.querySelector(profile.list), dst = document.querySelector(profile.list);
                if (src && dst) dst.append(...src.children);

                if (ctx.isPost) {
                    mountCommentVueComponents();
                }

                [profile.pagerTop, profile.pagerBot].forEach(sel => {
                    const s = doc.querySelector(sel), d = document.querySelector(sel);
                    if (s && d) d.innerHTML = s.innerHTML;
                });

                history.pushState(null, null, nextUrl);
            } catch (e) { ctx.env.error("autoLoading", e); }
            busy = false;
        };

        if (ctx.isPost && ctx.store.get("loading_comment.nested")) {
            const RAINBOW = [[59,130,246],[14,165,233],[16,185,129],[132,204,22],[245,158,11],[249,115,22],[239,68,68],[236,72,153],[217,70,239],[139,92,246],[99,102,241],[20,184,166]];
            const COL_DEPTH = 4, COL_MIN_W = 420;
            addStyle("nsx-nested", `:root{--ns-card-bg:#fff;--ns-card-border:rgba(15,23,42,.1);--ns-card-rail:rgba(59,130,246,.52);--ns-card-rail-hover:rgba(59,130,246,.78);--ns-card-shadow:0 1px 2px rgba(15,23,42,.05);--ns-card-shadow-hover:0 8px 20px rgba(15,23,42,.1);--ns-nested-border:rgba(15,23,42,.1);--ns-muted:#64748b;--ns-floor-bg:#eef2f7}body.dark-layout{--ns-card-bg:rgba(255,255,255,.02);--ns-card-border:rgba(255,255,255,.08);--ns-card-rail:rgba(125,211,252,.54);--ns-card-rail-hover:rgba(125,211,252,.84);--ns-card-shadow:0 1px 2px rgba(0,0,0,.25);--ns-card-shadow-hover:0 8px 20px rgba(0,0,0,.35);--ns-nested-border:rgba(255,255,255,.12);--ns-muted:#9aa8b8;--ns-floor-bg:rgba(148,163,184,.18)}.comments>.content-item{background:var(--ns-card-bg)!important;border:1px solid var(--ns-card-border)!important;border-left:4px solid var(--ns-card-rail)!important;box-shadow:var(--ns-card-shadow);padding:12px 12px 12px 18px!important;margin-bottom:10px!important;border-radius:10px!important;transition:background .2s,border-color .2s,box-shadow .2s;position:relative;overflow:visible!important}.comments>.content-item:hover{border-left-color:var(--ns-card-rail-hover)!important;box-shadow:var(--ns-card-shadow-hover)}.nested-replies-container{margin-top:10px;padding:2px 0 6px var(--ns-branch-indent,14px);background:transparent!important;position:relative}.nested-replies-container>.content-item.is-nested{border:1px solid var(--ns-card-border)!important;background:var(--ns-card-bg)!important;margin:0 0 4px 2px!important;padding:6px 10px!important;box-shadow:0 2px 6px rgba(15,23,42,.04)!important;overflow:visible!important;border-left:2px solid var(--ns-depth-soft,rgba(203,213,225,.4))!important;border-radius:6px!important;transition:border-color .2s;position:relative}.dark-layout .nested-replies-container>.content-item.is-nested{box-shadow:0 2px 6px rgba(0,0,0,.2)!important}.nested-replies-container>.content-item.is-nested:last-child{margin-bottom:0!important}.nested-replies-container>.content-item.is-nested:hover{border-left-color:var(--ns-depth-strong,var(--ns-card-rail-hover))!important}.nested-replies-container>.content-item.is-nested::before{content:"";position:absolute;left:-2px;top:0;width:8px;height:100%;cursor:pointer}.nested-replies-container>.content-item.is-nested.ns-floor-hidden{padding-bottom:6px!important;border-style:dashed!important;opacity:.95}.nested-replies-container>.content-item.is-nested.ns-floor-hidden>.post-content,.nested-replies-container>.content-item.is-nested.ns-floor-hidden>.signature,.nested-replies-container>.content-item.is-nested.ns-floor-hidden>.comment-menu,.nested-replies-container>.content-item.is-nested.ns-floor-hidden>.nested-collapse-toggle,.nested-replies-container>.content-item.is-nested.ns-floor-hidden>.nested-replies-container{display:none!important}.nested-replies-container>.content-item.is-nested.ns-floor-hidden::after{content:"已隐藏该楼层（点击左侧彩条展开）";display:block;margin-top:4px;font-size:11px;color:var(--ns-muted);user-select:none}.nested-collapse-toggle{margin-top:6px;margin-bottom:2px;display:inline-flex;align-items:center;gap:6px;color:var(--ns-muted);font-size:11px;font-weight:600;background:linear-gradient(90deg,var(--ns-floor-bg),transparent);border:1px solid var(--ns-nested-border);border-left:2px solid var(--ns-card-rail);border-radius:12px;padding:4px 10px;cursor:pointer;user-select:none;transition:background .25s,border-color .25s,box-shadow .25s,transform .2s}.nested-collapse-toggle:hover{box-shadow:0 2px 4px rgba(15,23,42,.06);transform:translateY(-.5px)}.nested-collapse-toggle:active{transform:translateY(0);box-shadow:none}.nested-collapse-toggle::before{content:"↳";font-size:13px;line-height:1;opacity:.7}.nested-replies-container.is-collapsed>.content-item{display:none!important}.is-nested>.post-content,.is-nested>.signature{margin-left:var(--ns-post-indent,40px)}`);

            const depthOf = el => { let d = 0, c = el.parentElement; while (c) { if (c.classList.contains("nested-replies-container")) d++; c = c.parentElement; } return d; };
            const applyDepth = root => {
                root.querySelectorAll(".content-item").forEach(li => {
                    const d = depthOf(li); li.dataset.nsDepth = d;
                    if (li.classList.contains("is-nested") && d > 0) {
                        const [r, g, b] = RAINBOW[(d - 1) % RAINBOW.length];
                        li.style.setProperty("--ns-depth-soft", `rgba(${r},${g},${b},.42)`);
                        li.style.setProperty("--ns-depth-strong", `rgb(${r},${g},${b})`);
                        li.style.setProperty("--ns-post-indent", `${Math.max(24, 40 - (d - 1) * 2)}px`);
                    }
                });
                root.querySelectorAll(".nested-replies-container").forEach(c => {
                    const p = c.parentElement;
                    if (!p?.classList.contains("content-item")) return;
                    const nd = +(p.dataset.nsDepth || 0) + 1;
                    c.style.setProperty("--ns-branch-indent", `${Math.max(0, 10 - (nd - 1) * 2)}px`);
                    const w = c.getBoundingClientRect().width;
                    const shouldCollapse = nd >= COL_DEPTH || (w > 0 && w < COL_MIN_W);
                    let toggle = p.querySelector(":scope > .nested-collapse-toggle");
                    if (!toggle) {
                        toggle = Object.assign(document.createElement("button"), { type: "button", className: "nested-collapse-toggle" });
                        toggle.addEventListener("click", () => {
                            const collapsed = c.classList.toggle("is-collapsed");
                            if (collapsed) { delete c.dataset.nsUserExpanded; } else { c.dataset.nsUserExpanded = "1"; }
                            c.querySelectorAll(".nested-replies-container").forEach(sc => { if (collapsed) { sc.classList.add("is-collapsed"); delete sc.dataset.nsUserExpanded; } else { sc.classList.remove("is-collapsed"); sc.dataset.nsUserExpanded = "1"; } });
                            applyDepth(root);
                        });
                        p.insertBefore(toggle, c);
                    }
                    if (shouldCollapse) {
                        if (!c.dataset.nsUserExpanded) c.classList.add("is-collapsed");
                        toggle.style.display = "inline-flex";
                        toggle.textContent = c.classList.contains("is-collapsed") ? (nd >= COL_DEPTH ? "层级较深，点击展开整支对话" : "可视区域较窄，点击展开整支对话") : "收起整支对话";
                    } else { c.classList.remove("is-collapsed"); toggle.style.display = "none"; }
                });
            };

            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const tip = Object.assign(document.createElement("div"), { style: "padding:8px 12px;margin-bottom:10px;border-radius:6px;text-align:center;background:#fbbf24;color:#000;font-size:14px" });
            document.querySelector(profile.list)?.before(tip);
            const fetchAll = async () => {
                let page = 1;
                try {
                    while (ctx.$(profile.next)) { tip.textContent = `正在拉取第 ${++page} 页评论以构建楼中楼…`; await load(true); await sleep(ctx.store.get("loading_comment.interval", 800)); }
                    tip.textContent = `✓ 全部 ${page} 页评论加载完成，正在重组楼中楼…`;
                } catch (e) { tip.textContent = `第 ${page} 页拉取失败：${e.message}`; return; }
                document.querySelectorAll(profile.pagerTop + "," + profile.pagerBot).forEach(e => e.style.display = "none");
                const root = document.querySelector(profile.list);
                const nodes = $$("ul.comments > li.content-item");
                const map = new Map(nodes.map(li => [parseInt(li.id), li])); map.delete(NaN);
                map.forEach((li, id) => {
                    for (const a of li.querySelector(".post-content")?.querySelectorAll('a[href*="#"]') ?? []) {
                        const pid = parseInt(a.textContent.replace("#", ""));
                        if (isNaN(pid)) continue;
                        const parent = map.get(pid);
                        if (parent && id > pid) {
                            a.style.display = "none"; li.classList.add("is-nested");
                            (parent.querySelector(":scope > .nested-replies-container") || parent.appendChild(Object.assign(document.createElement("div"), { className: "nested-replies-container" }))).append(li);
                        }
                        break;
                    }
                });
                if (root) {
                    applyDepth(root);
                    root.addEventListener("click", e => {
                        const li = e.target.closest(".nested-replies-container > .content-item.is-nested");
                        if (!li) return;
                        const ox = e.clientX - li.getBoundingClientRect().left;
                        if (ox < -2 || ox > 8) return;
                        e.preventDefault(); e.stopPropagation();
                        li.classList.toggle("ns-floor-hidden");
                    }, true);
                }
                tip.textContent = `✓ 楼中楼重组完成（共 ${page} 页，${nodes.length} 条评论）`;
                tip.style.background = "#57BF57"; tip.style.color = "#fff";
                setTimeout(() => tip.remove(), 3000);
            };
            requestIdleCallback(fetchAll);
        } else {
            const deb = debounce(load, 300);
            addEventListener("scroll", throttle(() => { if (scrollY > prevY) deb(); prevY = scrollY; }, 200), { passive: true });
        }
    }
};
