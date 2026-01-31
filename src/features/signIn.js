// 自动签到
import { net } from "../core.js";

export default {
    id: "signIn",
    deps: ["ui"],
    order: 80,
    cfg: {
        sign_in: {
            ns: { enabled: true, method: 1, last_date: "" },
            df: { enabled: true, method: 1, last_date: "" }
        }
    },
    meta: {
        sign_in: {
            label: "自动签到", group: "基本设置",
            fields: { method: { type: "RADIO", label: "签到方式", valueType: "number", options: [{ value: 1, text: "随机🍗" }, { value: 2, text: "5个🍗" }] } },
            hidden: ["last_date"]
        }
    },
    match: ctx => ctx.site && ctx.loggedIn && ctx.store.get(`sign_in.${ctx.site.code}.enabled`, true),
    async init(ctx) {
        const code = ctx.site.code;
        const method = ctx.store.get(`sign_in.${code}.method`, 0);
        const now = (() => {
            const off = new Date().getTimezoneOffset() + 480;
            const bj = new Date(Date.now() + off * 60000);
            return `${bj.getFullYear()}/${bj.getMonth() + 1}/${bj.getDate()}`;
        })();
        if (ctx.store.get(`sign_in.${code}.last_date`) === now) return;
        ctx.store.set(`sign_in.${code}.last_date`, now);
        try {
            const r = await net.post(`/api/attendance?random=${method === 1}`);
            r?.success ? ctx.ui.success?.(`签到成功！+${r.gain}🍗，共${r.current}🍗`) : ctx.ui.info?.(r?.message || "签到失败");
        } catch (e) { ctx.ui.info?.(e?.message || "签到错误"); }
    }
};
