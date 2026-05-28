// 回帖足迹模块 (NodeSeek & DeepFlood)
import { addStyle, define } from "../core.js";

const DB = 'nsx-comments-db';
const ST = 'nsx-comments-store';
const K = { I: "nsx_init", P: "nsx_page", T: "nsx_time", C: "nsx_count" };

const REPLIED_BADGE_CSS = `
.replied-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    font-size: 12px;
    color: #fff;
    background: #10b981;
    border-radius: 4px;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.1s ease;
}
.replied-badge:hover {
    background: #059669;
    color: #fff !important;
    transform: translateY(-1px);
}
`;

// 数据库单例连接与操作
let dbInstance = null;
let dbInitPromise = null;

const getDB = () => {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open(DB, 1);

        r.onerror = () => {
            dbInitPromise = null;
            reject(r.error || new Error('DB Open Failed'));
        };

        r.onupgradeneeded = e => {
            const db = e.target.result;
            if (db.objectStoreNames.contains(ST)) db.deleteObjectStore(ST);
            const s = db.createObjectStore(ST, { keyPath: ['uid', 'post_id', 'floor_id'] });
            s.createIndex('upid', ['uid', 'post_id']);
        };

        r.onsuccess = e => {
            dbInstance = e.target.result;

            dbInstance.onclose = () => {
                dbInstance = null;
                dbInitPromise = null;
            };
            dbInstance.onversionchange = () => {
                dbInstance.close();
                dbInstance = null;
                dbInitPromise = null;
            };

            resolve(dbInstance);
        };
    });

    return dbInitPromise;
};

const dbAct = async (mode, fn) => {
    const db = await getDB();
    return new Promise((res, rej) => {
        const tx = db.transaction([ST], mode);
        tx.onerror = () => rej(tx.error || new Error('Transaction Error'));
        tx.onabort = () => rej(tx.error || new Error('Transaction Aborted'));

        try {
            fn(tx.objectStore(ST), res, rej);
        } catch (e) {
            rej(e);
        }
    });
};

// 列表帖子标记具体实现
const markElement = async (ctx, el, uid) => {
    const linkEl = el.querySelector('.post-title a');
    if (!linkEl) return;
    const match = linkEl.href.match(/-(\d+)-/);
    if (!match) return;
    const pid = parseInt(match[1]);

    try {
        const max = await dbAct('readonly', (s, r) => {
            const range = IDBKeyRange.bound([uid, pid, 0], [uid, pid, Infinity]);
            s.openCursor(range, 'prev').onsuccess = e => r(e.target.result?.value.floor_id || 0);
        });

        if (max > 0 && !el.querySelector('.replied-badge')) {
            const b = document.createElement('a');
            const commentPerPage = ctx.uw?.__config__?.commentPerPage || 10;
            const targetPage = Math.ceil(max / commentPerPage);
            Object.assign(b, {
                className: 'replied-badge',
                target: '_blank',
                textContent: `已回复 #${max}`,
                href: `/post-${pid}-${targetPage}#${max}`
            });
            el.querySelector('.post-title').append(b);
        }
    } catch (e) {
        ctx.env.warn('[Mark Error]', pid, e);
    }
};

export default {
    id: "commentFootprint",
    order: 360,
    cfg: {
        comment_footprint: {
            enabled: false,
            reset_db: "",
            show_stats: ""
        }
    },
    meta: {
        comment_footprint: {
            label: "回帖足迹",
            group: "实验性",
            fields: {
                reset_db: {
                    type: "BUTTON",
                    label: "重置数据",
                    buttonText: "重置足迹",
                    action: "comment_footprint:reset",
                    desc: "清空本地数据库中的回帖历史并重新同步。"
                },
                show_stats: {
                    type: "BUTTON",
                    label: "数据统计",
                    buttonText: "查看统计",
                    action: "comment_footprint:stats",
                    desc: "查看当前账号的回帖同步状态与记录总数。"
                }
            }
        }
    },
    match: ctx => ctx.loggedIn && ctx.store.get("comment_footprint.enabled", false),
    init(ctx) {
        const uid = ctx.uid;
        const uName = ctx.user?.member_name;
        const SID = location.host.replace(/\W/g, '');

        addStyle("nsx-replied-badge", REPLIED_BADGE_CSS);

        // 存储与抓取配置
        const getProgress = (k, def) => (GM_getValue(SID, {})[uid]?.[k] ?? def);
        const setProgress = (k, v) => {
            const d = GM_getValue(SID, {});
            if (!d[uid]) d[uid] = {};
            d[uid][k] = v;
            GM_setValue(SID, d);
        };
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        // 核心同步逻辑
        const sync = async (mode) => {
            const isInit = mode === 'init';
            let p = isInit ? getProgress(K.P, 1) : 1;
            let n = 0;
            let stop = 0;
            const max = Math.ceil((ctx.user?.nComment || 0) / 15) || 999;
            ctx.env.log(`[${SID}#${uName}] ${mode} start p:${p}`);

            while (!stop && (isInit ? p <= max : true)) {
                const subEl = document.querySelector('.msc-sub');
                if (subEl) {
                    subEl.textContent = `正在同步: 第 ${p} / ${isInit ? max : '?'} 页`;
                }

                const res = await ctx.net.get(`/api/content/list-comments?uid=${uid}&page=${p}`);
                if (!res || !res.success || !res.comments?.length) break;

                for (const c of res.comments) {
                    if (!c.floor_id) continue;
                    const exist = await dbAct('readonly', (s, r) => s.get([uid, c.post_id, c.floor_id]).onsuccess = e => r(!!e.target.result));
                    if (!isInit && exist) {
                        stop = 1;
                    } else {
                        await dbAct('readwrite', (s, r) => s.put({ uid, post_id: c.post_id, floor_id: c.floor_id }).onsuccess = () => r(n++));
                    }
                }
                if (isInit) setProgress(K.P, p);
                p++;
                await sleep(1000);
            }

            const total = await dbAct('readonly', (s, r) => s.index('upid').count(IDBKeyRange.bound([uid, 0], [uid, Infinity])).onsuccess = e => r(e.target.result));
            setProgress(K.C, total);
            setProgress(K.T, Date.now());
            if (isInit) {
                setProgress(K.I, true);
                setProgress(K.P, 1);
            }
            return n;
        };

        const markAll = () => {
            if (!ctx.isList) return;
            ctx.$$('.post-list-item').forEach(el => {
                if (!el.classList.contains('nsx-replied-checked')) {
                    el.classList.add('nsx-replied-checked');
                    markElement(ctx, el, uid);
                }
            });
        };

        // 启动主同步流（加排他锁）
        const startSync = () => {
            navigator.locks.request(`nsx_sync_${uid}`, { ifAvailable: true }, async lock => {
                markAll();
                if (!lock) return;

                try {
                    if (!getProgress(K.I)) {
                        const last = getProgress(K.P, 1);
                        const title = last > 1 ? '断点续传' : '初始化回复数据';
                        const msg = last > 1
                            ? `检测到账号 [${uName}] 上次同步中断，进度第 ${last} 页。\n是否继续？`
                            : `检测到账号 [${uName}] 尚未同步记录。\n是否开始抓取？`;

                        ctx.ui.confirm(title, msg, async () => {
                            ctx.ui.alert('正在同步', `账号: ${uName}\n请保持页面开启...`);
                            try {
                                const n = await sync('init');
                                const confirmEl = document.querySelector('.msc-confirm');
                                if (confirmEl) confirmEl.remove();
                                ctx.ui.success(`同步完成: 新增 ${n} 条记录`);
                                markAll();
                            } catch (e) {
                                const confirmEl = document.querySelector('.msc-confirm');
                                if (confirmEl) confirmEl.remove();
                                ctx.ui.error(`同步失败: ${e.message}`);
                            }
                        });
                    } else {
                        const n = await sync('inc');
                        if (n > 0) markAll();
                    }
                } catch (e) {
                    ctx.env.error('[NSX Critical Error]', e);
                }
            });
        };

        // 事件动作响应
        const handleActions = async (e) => {
            if (e.detail === 'comment_footprint:reset') {
                if (!ctx.ui.layer) return;
                ctx.ui.layer.confirm('仅清空当前账号的缓存记录，不影响其他账号。', { title: '确认重置？', icon: 3 }, async (index) => {
                    ctx.ui.layer.close(index);
                    try {
                        await dbAct('readwrite', (s, r) => {
                            const req = s.index('upid').openCursor(IDBKeyRange.bound([uid, 0], [uid, Infinity]));
                            req.onsuccess = event => {
                                const cursor = event.target.result;
                                if (cursor) {
                                    cursor.delete();
                                    cursor.continue();
                                } else {
                                    r();
                                }
                            };
                        });
                        const d = GM_getValue(SID, {});
                        delete d[uid];
                        GM_setValue(SID, d);
                        ctx.ui.success("重置成功，页面即将刷新...");
                        setTimeout(() => location.reload(), 1000);
                    } catch (err) {
                        ctx.ui.error(`重置失败: ${err.message}`);
                    }
                });
            } else if (e.detail === 'comment_footprint:stats') {
                if (!ctx.ui.layer) return;
                const timeStr = getProgress(K.T) ? new Date(getProgress(K.T)).toLocaleString() : '无';
                ctx.ui.layer.alert(`用户: ${uName}<br>状态: ${getProgress(K.I) ? '✅ 完成' : '⏳ 进行中'}<br>更新: ${timeStr}<br>记录: ${getProgress(K.C, 0)} 条`, { title: '数据统计', icon: 1 });
            }
        };

        document.addEventListener('nsx-action', handleActions);
        startSync();
    },
    watch: ctx => ({
        sel: '.post-list-item:not(.nsx-replied-checked)',
        fn: els => {
            els.forEach(el => {
                el.classList.add('nsx-replied-checked');
                markElement(ctx, el, ctx.uid);
            });
        }
    })
};
