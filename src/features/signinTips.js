// 签到提示
import { addStyle, net, $, $$ } from "../core.js";

const CSS = `.nsplus-tip{background:rgba(255,217,0,.8);padding:3px;text-align:center;animation:blink 5s ease infinite}.nsplus-tip p,.nsplus-tip p a{color:#f00}.nsplus-tip p a:hover{color:#0ff}`;

export default {
    id: "signinTips",
    deps: ["ui"],
    order: 82,
    cfg: { signin_tips: { enabled: true } },
    meta: { signin_tips: { label: "签到提示", group: "基本设置" } },
    match(ctx) {
        if (!ctx.site || !ctx.loggedIn || !ctx.store.get("signin_tips.enabled", true)) return false;
        return ctx.store.get(`sign_in.${ctx.site.code}.enabled`, true) === false;
    },
    init(ctx) {
        addStyle("nsx-signtip", CSS);
        const code = ctx.site.code;
        const now = (() => { const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 6e4); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; })();
        if (now === ctx.store.get(`sign_in.${code}.ignore_date`) || now === ctx.store.get(`sign_in.${code}.last_date`)) return;

        const header = $("header");
        if (!header) return;
        const tip = document.createElement("div");
        tip.className = "nsplus-tip";
        tip.innerHTML = `<p>今天还没签到！【<a class="nsx-sign" data-r="1">随机🍗</a>】【<a class="nsx-sign" data-r="0">5个🍗</a>】【<a class="nsx-ign">今天不提示</a>】</p>`;
        header.appendChild(tip);

        $$(".nsx-sign", tip).forEach(a => a.onclick = async e => {
            e.preventDefault();
            try {
                const r = await net.post(`/api/attendance?random=${a.dataset.r === "1"}`);
                r?.success ? ctx.ui.success?.(`签到成功！+${r.gain}🍗`) : ctx.ui.info?.(r?.message || "签到失败");
            } catch (e) { ctx.ui.warning?.(e?.message || "失败"); }
            tip.remove();
            ctx.store.set(`sign_in.${code}.last_date`, now);
        });
        $(".nsx-ign", tip).onclick = e => { e.preventDefault(); tip.remove(); ctx.store.set(`sign_in.${code}.ignore_date`, now); };
    }
};
