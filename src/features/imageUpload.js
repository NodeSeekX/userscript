// 图床上传模块 (NodeSeek 编辑器增强)
import { store } from "../core.js";

// 🌐 底层跨域网络请求封装
const api = (url, data, h = {}) => new Promise((res, rej) => GM_xmlhttpRequest({
    method: 'POST',
    url,
    headers: h,
    data,
    onload: r => {
        try {
            res(JSON.parse(r.responseText));
        } catch (e) {
            rej(new Error(`解析响应失败: ${r.responseText}`));
        }
    },
    onerror: rej
}));

const getFd = (k, f, ex = {}) => {
    let d = new FormData();
    d.append(k, f);
    Object.entries(ex).forEach(([key, val]) => d.append(key, val));
    return d;
};

const getImg = items => Array.from(items || []).filter(i => /image\//.test(i.type || i.kind)).map(i => i.getAsFile ? i.getAsFile() : i);

let uploadFn = null;

export default {
    id: "imageUpload",
    order: 250,
    cfg: {
        image_upload: {
            enabled: false,
            active: "Chevereto",
            url: "",
            token: "",
            headers: ""
        }
    },
    meta: {
        image_upload: {
            label: "图床上传",
            group: "图床设置",
            fields: {
                active: {
                    type: "SELECT",
                    label: "当前图床",
                    options: [
                        { text: "Chevereto", value: "Chevereto" },
                        { text: "LskyPro", value: "LskyPro" },
                        { text: "EasyImages", value: "EasyImages" },
                        { text: "Telegraph (含自建)", value: "Telegraph" },
                        { text: "Telegraph v2", value: "Telegraph2" }
                    ]
                },
                url: { type: "TEXT", label: "图床 URL", placeholder: "https://example.com", desc: "图床服务的基础 URL（例如：https://example.com）" },
                token: { type: "TEXT", label: "API Token", placeholder: "chv_q2L_... 或留空", desc: "API Token 或 Key，Telegraph 可不填" },
                headers: { type: "TEXTAREA", label: "自定义 Headers", placeholder: "{\n  \"Authorization\": \"Basic YWRtaW46ODMwNTA2NjM=\"\n}", desc: "可选，标准 JSON 格式，例如：{\"Authorization\": \"Basic ...\"}" }
            }
        }
    },
    match: ctx => ctx.store.get("image_upload.enabled", true),
    init(ctx) {
        // ⚡ 并发上传引擎
        const upload = async (files) => {
            const active = ctx.store.get("image_upload.active", "Chevereto");
            const baseUrl = ctx.store.get("image_upload.url", "https://example.com").replace(/\/$/, "");
            const token = ctx.store.get("image_upload.token", "");
            let extraHeaders = {};
            try {
                const rawHeaders = ctx.store.get("image_upload.headers", "");
                if (rawHeaders) {
                    extraHeaders = JSON.parse(rawHeaders);
                }
            } catch (e) {
                console.error("[NSX-IMG] 解析自定义 Headers 失败:", e);
            }

            // 🔀 图床策略路由 (支持自定义 Header 合并)
            const HOSTS = {
                Telegraph: f => ({ u: `${baseUrl}/upload`, d: getFd('file', f), h: { ...extraHeaders }, p: r => `![${f.name || 'image'}](${baseUrl}${r[0].src.startsWith('/') ? '' : '/'}${r[0].src})` }),
                Telegraph2: f => ({ u: `${baseUrl}/upload`, d: getFd('file', f), h: { ...extraHeaders }, p: r => `![${f.name || 'image'}](${r.data})` }),
                LskyPro: f => ({ u: `${baseUrl}/api/v1/upload`, d: getFd('file', f), h: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...extraHeaders }, p: r => `![${f.name || 'image'}](${r.data.links.url})` }),
                Chevereto: f => ({ u: `${baseUrl}/api/1/upload`, d: getFd('source', f), h: { Accept: 'application/json', 'X-API-Key': token, ...extraHeaders }, p: r => `![${f.name || 'image'}](${r.image.url})` }),
                EasyImages: f => ({ u: `${baseUrl}${token ? '/api/index.php' : '/app/upload.php'}`, d: getFd(token ? 'image' : 'file', f, token ? { token: token } : { sign: Math.floor(Date.now() / 1000) }), h: { ...extraHeaders }, p: r => `![${f.name || 'image'}](${r.url})` })
            };

            const S = HOSTS[active];
            if (!S || !files.length) return;
            const cm = document.querySelector('.CodeMirror')?.CodeMirror;
            console.log(`[NSX-IMG] 🚀 并发上传 ${files.length} 张图片...`);

            const log = (msg, col = '') => {
                let b = document.getElementById('ex-log') || document.querySelector('.mde-toolbar')?.appendChild(Object.assign(document.createElement('div'), { id: 'ex-log' }));
                if (b) b.innerHTML = `<span style="color:${col}; margin-left:10px">${msg}</span>`;
            };

            log('正在上传', 'green');
            if (ctx.ui?.info) {
                ctx.ui.info(`开始并发上传 ${files.length} 张图片...`);
            }

            let successCount = 0;
            let failCount = 0;

            await Promise.all(files.map(async f => {
                try {
                    let { u, d, h, p } = S(f), res = await api(u, d, h);
                    if (cm) cm.replaceRange(`\n${p(res)}\n`, cm.getCursor());
                    successCount++;
                    log('上传成功', 'green');
                } catch (e) {
                    failCount++;
                    log('上传失败', 'red');
                    console.error('[NSX-IMG] ❌ 上传失败', e);
                }
            }));

            if (ctx.ui?.toast) {
                if (failCount === 0) {
                    ctx.ui.success(`全部图片上传成功！(共 ${successCount} 张)`);
                } else if (successCount > 0) {
                    ctx.ui.warning(`图片上传完成: ${successCount} 张成功, ${failCount} 张失败。`);
                } else {
                    ctx.ui.error(`图片上传全部失败！`);
                }
            }
        };

        uploadFn = upload;

        // 1. 全局事件委托劫持粘贴 (粘贴拦截)
        document.addEventListener('paste', e => {
            if (!e.target.closest('.CodeMirror') && !e.target.closest('.mde-toolbar')) return;
            let f = getImg((e.clipboardData || e.originalEvent.clipboardData).items);
            if (f.length) {
                e.preventDefault();
                upload(f);
            }
        });

        // 2. 全局事件委托劫持拖拽 (拖拽拦截)
        document.addEventListener('dragover', e => {
            if (e.target.closest('.CodeMirror')) {
                e.preventDefault();
            }
        });
        document.addEventListener('drop', e => {
            if (e.target.closest('.CodeMirror')) {
                e.preventDefault();
                let f = getImg(e.dataTransfer.files);
                if (f.length) {
                    upload(f);
                }
            }
        });
    },
    watch: ctx => ({
        sel: '.i-icon-pic[title="图片"]:not(.t-hj)',
        fn: els => els.forEach(ob => {
            let nb = ob.cloneNode(true);
            nb.classList.add('t-hj');
            ob.replaceWith(nb);
            nb.onclick = () => {
                let i = document.createElement('input');
                i.type = 'file';
                i.multiple = true;
                i.accept = 'image/*';
                i.onchange = e => {
                    if (uploadFn) {
                        uploadFn(getImg(e.target.files));
                    }
                };
                i.click();
            };
        })
    })
};
