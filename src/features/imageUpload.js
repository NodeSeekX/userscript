// 图床上传模块 (NodeSeek 编辑器增强)

let ctx, pendingLogin = false, lastSyncTime = 0, tokenRequest = null;
const KEY = "image_upload", NODE = "NodeImage", API = "https://api.nodeimage.com", COOLDOWN = 5 * 60 * 1000;
const NAMES = { NodeImage: "NodeImage", Chevereto: "Chevereto", LskyPro: "LskyPro", EasyImages: "EasyImages", Telegraph: "Telegraph", Telegraph2: "Telegraph v2" };
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const key = k => `${KEY}.${k}`;
const get = (k, d = "") => ctx.store.get(key(k), d);
const set = (k, v) => ctx.store.set(key(k), v);
const md = (file, url) => `![${file.name || "image"}](${url})`;
const imgs = items => Array.from(items || []).filter(i => /image\//.test(i.type || i.kind) || (isSafari && i.kind === "file" && !i.type)).map(i => i.getAsFile ? i.getAsFile() : i).filter(Boolean);

const normalize = f => f.type && f.size ? Promise.resolve(f) : new Promise((y, n) => {
    const r = new FileReader(); r.onerror = n; r.readAsDataURL(f);
    r.onload = e => { const i = new Image(); i.onerror = n; i.src = e.target.result;
        i.onload = () => { const c = Object.assign(document.createElement("canvas"), { width: i.width, height: i.height }), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0); c.toBlob(b => b ? y(new File([b], (f.name || "img").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })) : n("blob"), "image/jpeg", 0.92); };
    };
});

const fd = (name, file, extra = {}) => {
    const data = new FormData();
    data.append(name, file);
    Object.entries(extra).forEach(([k, v]) => data.append(k, v));
    return data;
};

const log = (msg, color = "") => {
    const box = document.getElementById("ex-log") || document.querySelector(".mde-toolbar")?.appendChild(Object.assign(document.createElement("div"), { id: "ex-log" }));
    if (!box) return;
    box.textContent = "";
    if (msg) {
        const span = Object.assign(document.createElement("span"), { textContent: msg });
        span.style.cssText = `color:${color};margin-left:10px`;
        box.appendChild(span);
    }
};

const hostName = () => NAMES[get("active", NODE)] || get("active", NODE);
const updatePicTitles = () => document.querySelectorAll(".i-icon-pic.t-hj").forEach(el => { el.title = hostName(); });

const request = ({ method = "POST", url, data = null, headers = {}, withCredentials = false, responseType }) => {
    if ((m => m === "fetch" || m === "auto" && isSafari)(get("reqMode", "auto"))) return fetch(url, { method, body: data, credentials: "omit", headers }).then(r => r.ok ? r.json() : Promise.reject(Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })));
    return new Promise((resolve, reject) => GM_xmlhttpRequest({
        method, url, data, headers, withCredentials, responseType,
        onload: r => {
            try {
                const body = responseType === "json" ? r.response : JSON.parse(r.responseText);
                r.status >= 200 && r.status < 300 ? resolve(body) : reject(Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, response: body }));
            } catch { reject(new Error(`解析响应失败: ${r.responseText}`)); }
        },
        onerror: reject
    }));
};

const nodeToken = async () => {
    try {
        const r = await request({ method: "GET", url: `${API}/api/user/api-key`, headers: { Accept: "application/json" }, withCredentials: true, responseType: "json" });
        return { token: r?.api_key || null, status: r?.api_key ? "ok" : "error" };
    } catch (e) {
        return { token: null, status: [401, 403].includes(e.status) ? "not_logged_in" : "error" };
    }
};

const requestNodeToken = () => tokenRequest ||= nodeToken().finally(() => { tokenRequest = null; });

const saveToken = (token, notify = false) => {
    set("token", token);
    log("Token 获取成功", "green");
    setTimeout(() => log(""), 2000);
    notify && ctx.ui?.success?.("NodeImage Token 自动获取成功！");
    return token;
};

const ensureToken = async () => {
    const token = get("token", "");
    if (token) return token;

    log("正在获取 Token...", "#4D82D6");
    const r = await requestNodeToken();
    if (r.token) return saveToken(r.token);
    if (r.status === "not_logged_in") {
        pendingLogin = true;
        log("未登录，即将打开登录页...", "#D6A14D");
        setTimeout(() => GM_openInTab("https://www.nodeimage.com", { active: true }), 1500);
    } else log("Token 获取失败，请检查 network", "red");
    return null;
};

const syncNodeToken = async () => {
    if (get("active", NODE) !== NODE) return;
    const token = get("token", "");
    if (isSafari && token) return;
    if (!token && !pendingLogin) return;
    if (token && Date.now() - lastSyncTime < COOLDOWN) return;
    lastSyncTime = Date.now();

    if (!token) log("正在获取 Token...", "#4D82D6");
    const r = await requestNodeToken();
    if (r.token && r.token !== token) {
        pendingLogin = false;
        saveToken(r.token, true);
    } else if (!r.token && token) {
        set("token", "");
        ctx.ui?.warning?.("NodeImage Token 已失效，已清除本地缓存。");
    }
};

const headers = () => {
    try {
        const raw = get("headers", "");
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("[NSX-IMG] 解析 Headers 失败:", e);
        return {};
    }
};

const providers = {
    Telegraph: {
        build: (f, e) => ({ url: `${e.base}/upload`, data: fd("file", f), headers: e.headers }),
        parse: (r, e) => `${e.base}${r[0].src.startsWith("/") ? "" : "/"}${r[0].src}`
    },
    Telegraph2: {
        build: (f, e) => ({ url: `${e.base}/upload`, data: fd("file", f), headers: e.headers }),
        parse: r => r.data
    },
    LskyPro: {
        build: (f, e) => ({ url: `${e.base}/api/v1/upload`, data: fd("file", f), headers: { Accept: "application/json", Authorization: `Bearer ${e.token}`, ...e.headers } }),
        parse: r => r.data.links.url
    },
    Chevereto: {
        build: (f, e) => ({ url: `${e.base}/api/1/upload`, data: fd("source", f), headers: { Accept: "application/json", "X-API-Key": e.token, ...e.headers } }),
        parse: r => r.image.url
    },
    EasyImages: {
        build: (f, e) => {
            const ok = !!e.token;
            return { url: `${e.base}${ok ? "/api/index.php" : "/app/upload.php"}`, data: fd(ok ? "image" : "file", f, ok ? { token: e.token } : { sign: Math.floor(Date.now() / 1000) }), headers: e.headers };
        },
        parse: r => r.url
    },
    NodeImage: {
        build: (f, e) => ({ url: `${API}/api/upload`, data: fd("image", f), headers: { Accept: "application/json", "X-API-Key": e.token, ...e.headers } }),
        parse: r => r.links.direct
    }
};

const special = {
    [NODE]: {
        before: async env => env.token || (env.token = await ensureToken()),
        retry: async (e, env) => {
            if (![401, 403].includes(e.status)) return false;
            const r = await requestNodeToken();
            if (!r.token) return false;
            env.token = r.token;
            set("token", r.token);
            return true;
        },
        sync: syncNodeToken
    }
};

const insert = text => {
    const cm = document.querySelector(".CodeMirror")?.CodeMirror;
    if (cm) cm.replaceRange(`\n${text}\n`, cm.getCursor());
};

const pool = (arr, fn, n = 3) => { let i = 0; const go = () => i < arr.length ? fn(arr[i], i++).then(go) : null; return Promise.all(Array.from({ length: Math.min(n, arr.length) }, go)); };

const upload = async files => {
    if (!files.length) return;
    const env = { active: get("active", NODE), base: get("url", "https://example.com").replace(/\/$/, ""), token: get("token", ""), headers: headers() };
    const provider = providers[env.active];
    const ext = special[env.active];
    if (!provider) return;
    updatePicTitles();
    if (ext?.before && !(await ext.before(env))) return;

    log("正在上传", "green");
    ctx.ui?.info?.(`开始并发上传 ${files.length} 张图片...`);

    const results = [];
    let ok = 0, err = 0;

    const send = async file => {
        const res = await request(provider.build(file, env));
        return md(file, provider.parse(res, env));
    };

    await pool(files, async (file, index) => {
        try {
            results.push({ index, text: await send(file) });
            ok++;
            log(`已完成 ${ok + err}/${files.length}`, "green");
        } catch (e) {
            if (await ext?.retry?.(e, env)) {
                try {
                    results.push({ index, text: await send(file) });
                    ok++;
                    log(`已完成 ${ok + err}/${files.length}`, "green");
                    return;
                } catch (e2) { console.error("[NSX-IMG] 重试上传失败", e2); }
            }
            err++;
            log(`已完成 ${ok + err}/${files.length}，${err} 张失败`, "red");
            console.error("[NSX-IMG] 上传失败", e);
        }
    });

    if (results.length) {
        results.sort((a, b) => a.index - b.index);
        insert(results.map(r => r.text).join("\n"));
    }

    if (ctx.ui?.toast) {
        if (!err) ctx.ui.success(`全部图片上传成功！(共 ${ok} 张)`);
        else if (ok) ctx.ui.warning(`图片上传完成: ${ok} 张成功, ${err} 张失败。`);
        else ctx.ui.error("图片上传全部失败！");
    }
};

const prep = files => (isSafari ? Promise.all(files.map(normalize)) : Promise.resolve(files)).then(upload).catch(e => (log(`处理失败: ${e.message}`, "red"), console.error("[NSX-IMG]", e)));

const pick = () => {
    updatePicTitles();
    const input = Object.assign(document.createElement("input"), { type: "file", multiple: true, accept: "image/*", onchange: e => prep(imgs(e.target.files)) });
    input.click();
};

export default {
    id: "imageUpload",
    order: 250,
    cfg: { [KEY]: { enabled: false, active: NODE, url: "", token: "", headers: "", reqMode: "auto" } },
    meta: {
        [KEY]: {
            label: "图床上传", group: "图床设置", fields: {
                active: {
                    type: "SELECT", label: "当前图床", options: [
                        ["NodeImage (论坛官方)", NODE], ["Chevereto", "Chevereto"], ["LskyPro", "LskyPro"], ["EasyImages", "EasyImages"], ["Telegraph (含自建)", "Telegraph"], ["Telegraph v2", "Telegraph2"]
                    ].map(([text, value]) => ({ text, value }))
                },
                url: { type: "TEXT", label: "图床 URL", placeholder: "https://example.com", desc: "图床服务的基础 URL（例如：https://example.com）,NodeImage 可留空" },
                token: { type: "TEXT", label: "API Token", placeholder: "chv_q2L_... 或留空", desc: "API Token 或 Key，Telegraph 可不填" },
                headers: { type: "TEXTAREA", label: "自定义 Headers", placeholder: "{\n  \"Authorization\": \"Basic YWR...\"\n}", desc: "可选，标准 JSON 格式，例如：{\"Authorization\": \"Basic ...\"}" },
                reqMode: { type: "SELECT", label: "请求通道", options: [["自动 (Safari 使用 Fetch)", "auto"], ["Fetch API", "fetch"], ["GM_xmlhttpRequest", "gm"]].map(([text, value]) => ({ text, value })), desc: "Safari/iOS 建议使用 Fetch，其他浏览器建议 GM_xmlhttpRequest" }
            }
        }
    },
    match: c => c.store.get(key("enabled"), false),
    init(c) {
        ctx = c;
        updatePicTitles();
        document.addEventListener("paste", e => {
            if (!e.target.closest(".CodeMirror,.mde-toolbar")) return;
            const files = imgs((e.clipboardData || e.originalEvent?.clipboardData)?.items);
            files.length && (e.preventDefault(), prep(files));
        });
        document.addEventListener("dragover", e => e.target.closest(".CodeMirror") && e.preventDefault());
        document.addEventListener("drop", e => {
            if (!e.target.closest(".CodeMirror")) return;
            e.preventDefault();
            prep(imgs(e.dataTransfer.files));
        });
        window.addEventListener("focus", () => {
            updatePicTitles();
            special[get("active", NODE)]?.sync?.();
        });
    },
    watch: () => ({
        sel: '.mde-toolbar .i-icon-pic:not(.t-hj)',
        fn: els => els.forEach(el => {
            const btn = el.cloneNode(true);
            btn.classList.add("t-hj");
            btn.title = hostName();
            el.replaceWith(btn);
            btn.onclick = pick;
        })
    })
};
