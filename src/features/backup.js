// 云端备份模块 (Gist / WebDAV)
/* global GM_getValue, GM_setValue */

const GIST_API = "https://api.github.com/gists";
const FILE = "nsx_config.json";
const KEEP = ["backup_gist", "backup_webdav"]; // 凭据不上传，恢复时保留本地值

const btns = key => ({
    btn_up: { label: "备份", type: "BUTTON", buttonText: "⬆️ 立即备份", action: `nsx-backup-${key}-up`, col: 6 },
    btn_down: { label: "恢复", type: "BUTTON", buttonText: "⬇️ 立即恢复", action: `nsx-backup-${key}-down`, col: 6 }
});

const dump = () => {
    const s = { ...GM_getValue("settings", {}) };
    KEEP.forEach(k => delete s[k]);
    return JSON.stringify(s, null, 2);
};

const load = text => {
    const conf = JSON.parse(text);
    if (!conf || typeof conf !== "object" || Array.isArray(conf)) throw new Error("备份内容无效");
    const cur = GM_getValue("settings", {});
    KEEP.forEach(k => cur[k] && (conf[k] = cur[k]));
    GM_setValue("settings", conf);
};

const ok = res => {
    if (res.status < 400) return res;
    let msg; try { msg = JSON.parse(res.response).message; } catch { }
    throw new Error(msg || `HTTP ${res.status}`);
};

const providers = {
    async gist(ctx, up, val) {
        const token = val("backup_gist.gist_token"), id = val("backup_gist.gist_id");
        if (!token) throw new Error("未填写 Gist Token");
        const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github+json" };
        if (up) {
            const data = JSON.stringify({ description: "NodeSeek X Settings", files: { [FILE]: { content: dump() } } });
            const res = ok(await ctx.net.gmFetch({ method: id ? "PATCH" : "POST", url: id ? `${GIST_API}/${id}` : GIST_API, headers, data }));
            if (id) return;
            const newId = JSON.parse(res.response).id;
            ctx.store.set("backup_gist.gist_id", newId);
            const el = document.querySelector('[name="backup_gist.gist_id"]');
            if (el) el.value = newId;
        } else {
            if (!id) throw new Error("未填写 Gist ID");
            const res = ok(await ctx.net.gmFetch({ method: "GET", url: `${GIST_API}/${id}`, headers }));
            const content = JSON.parse(res.response).files?.[FILE]?.content;
            if (!content) throw new Error(`Gist 中未找到 ${FILE}`);
            load(content);
        }
    },
    async webdav(ctx, up, val) {
        const dir = val("backup_webdav.webdav_url"), user = val("backup_webdav.webdav_user"), pass = val("backup_webdav.webdav_pass");
        if (!dir || !user || !pass) throw new Error("WebDAV 信息不完整");
        const url = dir.replace(/\/*$/, "/") + FILE;
        const headers = { Authorization: `Basic ${btoa(`${user}:${pass}`)}` };
        if (up) ok(await ctx.net.gmFetch({ method: "PUT", url, headers: { ...headers, "Content-Type": "application/json" }, data: dump() }));
        else load(ok(await ctx.net.gmFetch({ method: "GET", url, headers })).response);
    }
};

export default {
    id: "backup",
    order: 150,
    cfg: {
        backup_gist: { gist_token: "", gist_id: "", btn_up: "", btn_down: "" },
        backup_webdav: { webdav_url: "", webdav_user: "", webdav_pass: "", btn_up: "", btn_down: "" }
    },
    meta: {
        backup_gist: {
            group: "备份设置", label: "GitHub Gist",
            fields: {
                gist_token: { label: "Token", placeholder: "GitHub PAT（需 gist 权限）" },
                gist_id: { label: "Gist ID", placeholder: "留空自动创建" },
                ...btns("gist")
            }
        },
        backup_webdav: {
            group: "备份设置", label: "WebDAV",
            fields: {
                webdav_url: { label: "目录", placeholder: "如 https://dav.jianguoyun.com/dav/NSX/", desc: `需为已存在的目录，备份文件名为 ${FILE}` },
                webdav_user: { label: "账号" },
                webdav_pass: { label: "密码" },
                ...btns("webdav")
            }
        }
    },
    init(ctx) {
        const val = k => document.querySelector(`[name="${k}"]`)?.value ?? ctx.store.get(k);
        document.addEventListener("nsx-action", async ({ detail }) => {
            const [, type, dir] = /^nsx-backup-(gist|webdav)-(up|down)$/.exec(detail) || [];
            if (!type) return;
            const up = dir === "up";
            if (!up && !confirm("将覆盖本地全部配置，确定恢复？")) return;
            const idx = ctx.ui.toast(up ? "正在备份..." : "正在恢复...");
            const err = await providers[type](ctx, up, val).then(() => null, e => e);
            ctx.ui.layer?.close(idx);
            if (err) return ctx.ui.error(`操作失败：${err.message}`);
            ctx.ui.success(up ? "备份成功" : "恢复成功，即将刷新");
            if (!up) setTimeout(() => location.reload(), 1500);
        });
    }
};
