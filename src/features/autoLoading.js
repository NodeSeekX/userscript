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
        const profile = ctx.isList ? PROFILES.list : ctx.isPost ? PROFILES.post : null;
        if (!profile) return;

        let busy = false, prevY = scrollY;

        const blockByLevel = (doc) => {
            const lv = ctx.user?.rank || 0;
            doc.querySelectorAll('.post-list-item use[href="#lock"]').forEach(el => {
                const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
                if (n > lv) el.closest(".post-list-item")?.classList.add("blocked-post");
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
                blockByLevel(doc);

                // 评论数据同步
                if (ctx.isPost) {
                    const json = doc.getElementById("temp-script")?.textContent;
                    if (json) try {
                        const cfg = JSON.parse(decodeURIComponent(atob(json).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
                        if (cfg?.postData?.comments) ctx.uw.__config__.postData.comments.push(...cfg.postData.comments);
                    } catch { }
                }

                const src = doc.querySelector(profile.list), dst = document.querySelector(profile.list);
                if (src && dst) dst.append(...src.children);

                // 渲染新加载评论的 Vue 组件
                if (ctx.isPost) {
                    const vue = $(".comment-menu")?.__vue__;
                    if (vue) $$(".content-item").forEach((item, index) => {
                        const mp = $(".comment-menu-mount", item);
                        if (mp) { const inst = new vue.$root.constructor(vue.$options); inst.setIndex(index); inst.$mount(mp); }
                    });
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
