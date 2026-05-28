// 屏蔽用户
import { net, addStyle } from "../core.js";

export default {
    id: "blockMembers",
    order: 240,
    cfg: { block_members: { enabled: true } },
    meta: { block_members: { label: "屏蔽用户", group: "过滤设置" } },
    match: ctx => ctx.loggedIn && ctx.store.get("block_members.enabled", true),
    init(ctx) {
        addStyle("nsx-block", ".usercard-button-group .btn{padding:0 .8rem}");
        const block = name => net.post("/api/block-list/add", { block_member_name: name })
            .then(r => ctx.ui.alert?.("提示", r?.success ? `屏蔽【${name}】成功` : `屏蔽失败：${r?.message || ""}`));

        document.querySelectorAll(".post-list .post-list-item,.content-item").forEach(item => {
            const avatar = item.querySelector(".avatar-normal");
            if (!avatar) return;
            avatar.addEventListener("click", () => {
                let tries = 0;
                const check = setInterval(() => {
                    if (++tries > 60) { clearInterval(check); return; } // 3 秒超时 (50ms × 60)
                    const card = document.querySelector("div.user-card.hover-user-card");
                    const pm = card?.querySelector("a.btn");
                    if (!card || !pm) return;
                    clearInterval(check);
                    const name = card.querySelector("a.Username")?.textContent;
                    if (!name || card.querySelector(".nsx-block-btn")) return;

                    const btn = pm.cloneNode(false);
                    btn.className = "btn nsx-block-btn";
                    btn.textContent = "屏蔽";
                    btn.style.cssText = "float:left;background-color:rgba(0,0,0,.3)!important";
                    btn.onclick = e => { e.preventDefault(); ctx.ui.confirm?.(`屏蔽"${name}"？`, "可在设置=>屏蔽用户解除", () => block(name)); };
                    pm.after(btn);
                }, 50);
            });
        });
    }
};
