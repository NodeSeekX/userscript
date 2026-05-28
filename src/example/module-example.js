/**
 * NodeSeek X — 新模块开发示例
 *
 * 本文件展示了模块定义契约中的所有可用选项和参数。
 * 将模块文件放在 src/features/ 目录下，构建时会被 import.meta.glob 自动发现并加载。
 *
 * ⚠️ 本文件仅供参考，不参与构建。
 */

// ===== 导入 =====
// core.js 提供的全部可用工具函数
import {
    $,         // (selector, root?) => Element | null      — querySelector 封装
    $$,        // (selector, root?) => Element[]            — querySelectorAll 封装（返回真数组）
    addStyle,  // (id, cssOrUrl) => void                    — 注入 <style> 或 <link>，id 防重
    addScript, // (id, jsOrUrl) => void                     — 注入 <script>，id 防重
    store,     // { get, set, reg, init, ... }              — 配置存储（底层为 GM_getValue/GM_setValue）
    net,       // { fetch, get, post }                      — 网络请求封装
    env,       // { info, site, log, warn, error }          — 环境信息与日志
    debounce,  // (fn, ms) => DebouncedFn                   — 防抖
    throttle,  // (fn, ms) => ThrottledFn                   — 节流
} from "../core.js";


// ===== 模块定义 =====
export default {

    // ─────────────────────────────────────────────
    // id (必须) — 模块唯一标识符
    // ─────────────────────────────────────────────
    // 用于：模块注册、拓扑排序、日志输出
    // 命名规范：camelCase
    id: "exampleModule",

    // ─────────────────────────────────────────────
    // order (推荐) — 执行优先级，数值越小越先执行
    // ─────────────────────────────────────────────
    // 默认值：100
    // 用途：在拓扑排序后，同层级模块按 order 升序排列
    // 参考范围：
    //   0~50    基础设施（菜单、配置）
    //   80~100  核心功能（签到、加载）
    //   120~200 内容增强（评论、高亮、图片）
    //   200~300 过滤与显示（屏蔽、标签、历史）
    //   300+    辅助功能（预加载、滚动、样式）
    order: 150,

    // ─────────────────────────────────────────────
    // deps (可选) — 依赖的其他模块 ID 列表
    // ─────────────────────────────────────────────
    // 拓扑排序时保证被依赖的模块先于本模块执行
    // 如果依赖的模块 ID 不存在（未注册），该依赖会被静默跳过
    // 注意：当前项目中没有公共的可依赖模块，通常不需要此字段
    // deps: ["otherModule"],

    // ─────────────────────────────────────────────
    // cfg (推荐) — 默认配置片段
    // ─────────────────────────────────────────────
    // 在 define() 阶段通过 store.reg() 注册到全局配置
    // 启动时与用户已保存的配置 merge（仅补充新字段，不覆盖已有值）
    // 键名规范：snake_case（与 id 的 camelCase 不同）
    //
    // 读取方式：ctx.store.get("example_module.enabled", true)
    // 写入方式：ctx.store.set("example_module.my_text", "新值")
    cfg: {
        example_module: {
            enabled: true,              // 总开关
            my_text: "默认文本",         // 文本配置
            my_number: 42,              // 数值配置
            my_switch: false,           // 布尔配置
            my_radio: "option_a",       // 单选配置
            my_color: "#409EFF",        // 颜色配置
            my_keywords: [],            // 数组配置（TEXTAREA + valueType: "array"）
        }
    },

    // ─────────────────────────────────────────────
    // meta (推荐) — 设置面板 UI 元信息
    // ─────────────────────────────────────────────
    // 由 menus.js 自动读取，驱动设置面板的表单渲染
    // 键名必须与 cfg 中的键名一一对应
    meta: {
        example_module: {
            // label — 在设置面板中显示的模块名称
            label: "示例模块",

            // group — 所属分组（决定显示在设置面板的哪个卡片下）
            // 可选值："基本设置" | "显示设置" | "内容设置" | "过滤设置" | "其他设置" | "实验性"
            group: "其他设置",

            // fields — 各配置项的表单控件定义
            // 键名对应 cfg 中 example_module 下的属性名
            // enabled 字段会被自动渲染为卡片头部的主开关，无需在 fields 中定义
            fields: {

                // ── SWITCH 开关 ──────────────────────
                // 渲染为 layui 的 switch 开关
                my_switch: {
                    type: "SWITCH",
                    label: "子功能开关",
                },

                // ── TEXT 文本框 ──────────────────────
                // 渲染为单行 <input type="text">
                // 目前项目中未直接使用，但 menus.js 支持此类型
                my_text: {
                    type: "TEXT",
                    label: "文本配置",
                    placeholder: "请输入文本",  // 可选：输入框占位提示
                },

                // ── NUMBER 数字框 ────────────────────
                // 渲染为 <input type="number">
                my_number: {
                    type: "NUMBER",
                    label: "数值配置",
                    valueType: "number",        // 必须：确保存储值为 number 而非 string
                },

                // ── TEXTAREA 多行文本 ────────────────
                // 渲染为 <textarea>
                my_keywords: {
                    type: "TEXTAREA",
                    label: "关键词列表",
                    placeholder: "每行一个",     // 可选：占位提示
                    valueType: "array",          // 可选："array" 表示按行分割存储为数组
                    desc: "这里可以写更详细的说明文字", // 可选：描述信息
                },

                // ── RADIO 单选 ───────────────────────
                // 渲染为一组 <input type="radio">
                my_radio: {
                    type: "RADIO",
                    label: "模式选择",
                    options: [                   // 必须：选项列表
                        { value: "option_a", text: "模式 A" },
                        { value: "option_b", text: "模式 B" },
                    ],
                    // valueType: "number",      // 可选：当 value 为数字时使用
                },

                // ── COLOR 颜色选择器 ─────────────────
                // 渲染为 layui colorpicker 组件
                my_color: {
                    type: "COLOR",
                    label: "主题颜色",
                },

                // ── BUTTON 按钮 ──────────────────────
                // 渲染为一个按钮，点击触发自定义事件
                // 不绑定 cfg 字段，仅用于交互（如打开弹窗编辑）
                my_action: {
                    type: "BUTTON",
                    label: "高级操作",
                    buttonText: "点击执行",       // 按钮显示文字
                    action: "do_something",       // 触发的自定义事件名（通过 dispatchEvent 分发）
                },
            }
        }
    },

    // ─────────────────────────────────────────────
    // match (推荐) — 匹配条件函数
    // ─────────────────────────────────────────────
    // 参数：ctx（运行时上下文对象）
    // 返回 false 时跳过 init，返回 true 或 undefined 时执行 init
    // 用途：根据页面类型、登录状态、配置开关等决定是否激活模块
    //
    // ctx 上下文对象包含以下属性：
    //   ctx.env          — 环境信息 { info, site, log, warn, error }
    //   ctx.$, ctx.$$    — DOM 选择器
    //   ctx.addStyle     — 样式注入
    //   ctx.store        — 配置存储 { get(path, default), set(path, value) }
    //   ctx.net          — 网络请求 { fetch, get, post }
    //   ctx.uw           — unsafeWindow（宿主页面 window）
    //   ctx.loggedIn     — getter: 是否已登录
    //   ctx.user         — getter: 当前用户对象 { member_id, rank, ... }
    //   ctx.uid          — getter: 用户 ID
    //   ctx.site         — 当前站点描述 { host, code, name }
    //   ctx.isPost       — 是否在帖子详情页（/post-*）
    //   ctx.isList       — 是否在列表页（首页/分类/搜索等）
    //   ctx.watch        — Observer 注册函数
    //   ctx.ui           — UI 工具集（依赖 layui）:
    //       ctx.ui.toast(text, style)   — 顶部通知条
    //       ctx.ui.info(msg)            — 蓝色通知
    //       ctx.ui.success(msg)         — 绿色通知
    //       ctx.ui.warning(msg)         — 黄色通知
    //       ctx.ui.error(msg)           — 红色通知
    //       ctx.ui.alert(title, content, fn)       — 弹窗
    //       ctx.ui.confirm(title, content, yes, no) — 确认框
    //       ctx.ui.tips(msg, el, opts)  — 工具提示
    //       ctx.ui.layer               — layui.layer 原生对象
    match(ctx) {
        // 典型条件组合示例：
        return ctx.loggedIn                                    // 需要登录
            && ctx.isPost                                      // 仅帖子页
            && ctx.store.get("example_module.enabled", true);  // 用户未关闭
    },

    // ─────────────────────────────────────────────
    // init (推荐) — 初始化函数
    // ─────────────────────────────────────────────
    // 在 boot() 阶段按拓扑排序 + order 顺序同步调用
    // 仅当 match() 未返回 false 时执行
    // 参数：ctx（同 match）
    // 异常会被 try/catch 捕获并通过 env.error 输出，不影响其他模块
    init(ctx) {
        // 1. 注入样式（id 防重复）
        addStyle("nsx-example", `.example-highlight { color: var(--link-hover-color) }`);

        // 2. 读取配置
        const text = ctx.store.get("example_module.my_text", "默认文本");
        const keywords = ctx.store.get("example_module.my_keywords", []);

        // 3. 操作 DOM
        $$(".post-title a").forEach(el => {
            if (keywords.some(k => el.textContent.includes(k))) {
                el.classList.add("example-highlight");
            }
        });

        // 4. 网络请求示例
        // const data = await net.get("/api/some-endpoint");

        // 5. 使用 UI 通知
        // ctx.ui.success("示例模块已加载");

        // 6. 日志输出（仅在 debug 模式下可见）
        ctx.env.log("exampleModule initialized", { text, keywords });
    },

    // ─────────────────────────────────────────────
    // watch (可选) — DOM 变更监听
    // ─────────────────────────────────────────────
    // 在 boot() 阶段注册到全局 MutationObserver
    // 当 document.body 的子树发生变更时，自动查询匹配元素并调用回调
    //
    // 返回值格式：
    //   单个监听器 → { sel, fn, opts }
    //   多个监听器 → [{ sel, fn, opts }, ...]
    //   也可以是返回上述格式的函数 → ctx => ({ sel, fn, opts })
    //
    // 参数说明：
    //   sel  — CSS 选择器，用于 querySelectorAll 查询匹配元素
    //   fn   — 回调函数，参数为匹配到的所有元素数组 (Element[])
    //          注意：每次 DOM 变更都会传入 ALL 匹配元素（不仅是新增的）
    //          如需防重，可使用 WeakSet 标记或依赖库自身的防重机制
    //   opts — 选项对象
    //          debounce: number — 防抖毫秒数（推荐 50~100ms）
    watch(ctx) {
        return {
            sel: ".post-title a",
            fn: els => {
                const keywords = ctx.store.get("example_module.my_keywords", []);
                els.forEach(el => {
                    if (keywords.some(k => el.textContent.includes(k))) {
                        el.classList.add("example-highlight");
                    }
                });
            },
            opts: { debounce: 80 }
        };

        // 多个监听器示例：
        // return [
        //     { sel: ".post-title a", fn: els => { ... }, opts: { debounce: 80 } },
        //     { sel: ".comment-item",  fn: els => { ... }, opts: { debounce: 100 } }
        // ];
    }
};
