// 等级标签
import { addStyle, net } from "../core.js";

const CSS = `.role-tag.user-level{background:#000;border-color:#000;color:#ffd700}.role-tag.user-lv0{background:#c7c2c2;border-color:#c7c2c2;color:#fafafa}.role-tag.user-lv1{background:#ffb74d;border-color:#ffb74d;color:#fafafa}.role-tag.user-lv2{background:#ff9400;border-color:#ff9400;color:#fafafa}.role-tag.user-lv3{background:#ff5252;border-color:#ff5252;color:#fafafa}.role-tag.user-lv4{background:#e53935;border-color:#e53935;color:#fafafa}.role-tag.user-lv5{background:#ab47bc;border-color:#ab47bc;color:#fafafa}.role-tag.user-lv6{background:#8e24aa;border-color:#8e24aa;color:#fafafa}.role-tag.user-lv7{background:#42a5f5;border-color:#42a5f5;color:#fafafa}.role-tag.user-lv8{background:#1e88e5;border-color:#1e88e5;color:#fafafa}.role-tag.user-lv9{background:#66bb6a;border-color:#66bb6a;color:#fafafa}.role-tag.user-lv10{background:#2e7d32;border-color:#2e7d32;color:#fafafa}.role-tag.user-lv11{background:#ffca28;border-color:#ffca28;color:#fafafa}.role-tag.user-lv12{background:#ffb300;border-color:#ffb300;color:#fafafa}.role-tag.user-lv13{background:#b388ff;border-color:#b388ff;color:#fafafa}.role-tag.user-lv14{background:#7c4dff;border-color:#7c4dff;color:#fafafa}.role-tag.user-lv15{background:#000;border-color:#000;color:#ffd700}`;

export default {
    id: "levelTag",
    order: 260,
    cfg: { level_tag: { enabled: true, low_lv_alarm: true, low_lv_max_days: 30 } },
    meta: { level_tag: { label: "等级标签", group: "显示设置", fields: { low_lv_alarm: { type: "SWITCH", label: "低等级警告" }, low_lv_max_days: { type: "NUMBER", label: "注册天数", valueType: "number" } } } },
    match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("level_tag.enabled", true),
    async init(ctx) {
        addStyle("nsx-lv", CSS);
        const opUid = ctx.uw?.__config__?.postData?.op?.uid;
        if (!opUid) return;
        let user;
        try {
            const r = await net.get(`/api/account/getInfo/${opUid}`);
            if (!r?.success) return;
            user = r.detail;
        } catch { return; }

        const days = Math.floor((Date.now() - new Date(user.created_at)) / 864e5);
        const alarm = ctx.store.get("level_tag.low_lv_alarm") && days < ctx.store.get("level_tag.low_lv_max_days", 30) ? "⚠️" : "";
        const coin = user.coin < 0 ? 0 : user.coin;
        const rank = Math.floor(Math.sqrt(coin) / 10);

        const span = document.createElement("span");
        span.className = `nsk-badge role-tag user-level user-lv${rank}`;
        span.innerHTML = `<span>${alarm}Lv ${rank}</span>`;
        span.onmouseenter = () => ctx.ui.tips?.(`注册 <span class="layui-badge">${days}</span> 天；帖子 ${user.nPost}；评论 ${user.nComment}`, span, { tips: 3, time: 0 });
        span.onmouseleave = () => ctx.ui.layer?.closeAll?.();

        ctx.$('#nsk-body .nsk-post .nsk-content-meta-info .author-info>a')?.after(span);
    }
};
