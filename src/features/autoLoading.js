// 下拉加载翻页
import { $, $$, net, debounce, throttle } from "../core.js";

const PROFILES = {
    list: { path: /^\/(categories\/|page|award|search|$)/, threshold: 1500, next: ".nsk-pager a.pager-next", list: "ul.post-list:not(.topic-carousel-panel)", pagerTop: "div.nsk-pager.pager-top", pagerBot: "div.nsk-pager.pager-bottom" },
    post: { path: /^\/post-/, threshold: 690, next: ".nsk-pager a.pager-next", list: "ul.comments", pagerTop: "div.nsk-pager.post-top-pager", pagerBot: "div.nsk-pager.post-bottom-pager" }
};

export default {
    id: "autoLoading",
    order: 100,
    cfg: { loading_post: { enabled: true }, loading_comment: { enabled: true } },
    meta: { loading_post: { label: "加载帖子", group: "内容设置" }, loading_comment: { label: "加载评论", group: "内容设置" } },
    match: ctx => ctx.store.get("loading_post.enabled", true) || ctx.store.get("loading_comment.enabled", true),
    init(ctx) {
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

        const load = async () => {
            if (busy) return;
            const atBottom = document.documentElement.scrollHeight <= innerHeight + scrollY + profile.threshold;
            if (!atBottom) return;
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

        const deb = debounce(load, 300);
        addEventListener("scroll", throttle(() => { if (scrollY > prevY) deb(); prevY = scrollY; }, 200), { passive: true });
    }
};
