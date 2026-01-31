// 图片预览
import { $$ } from "../core.js";

const mark = new WeakSet();
const bind = (els, ctx) => {
    els.forEach(img => {
        const post = img.closest("article.post-content");
        if (!post || mark.has(img)) return;
        mark.add(img);
        const newImg = img.cloneNode(true);
        img.replaceWith(newImg);
        mark.add(newImg);
        newImg.addEventListener("click", e => {
            e.preventDefault();
            const imgs = [...post.querySelectorAll("img:not(.sticker)")];
            const data = imgs.map((x, i) => ({ alt: x.alt, pid: i + 1, src: x.src }));
            ctx.ui.layer?.photos({ photos: { title: "图片预览", start: imgs.indexOf(newImg), data } });
        }, true);
    });
};

export default {
    id: "imageSlide",
    deps: ["ui"],
    order: 160,
    cfg: { image_slide: { enabled: true } },
    meta: { image_slide: { label: "图片预览", group: "内容设置" } },
    match: ctx => ctx.isPost && ctx.store.get("image_slide.enabled", true),
    init(ctx) { bind($$("article.post-content img:not(.sticker)"), ctx); },
    watch: ctx => ({ sel: "article.post-content img:not(.sticker)", fn: els => bind(els, ctx), opts: { debounce: 80 } })
};
