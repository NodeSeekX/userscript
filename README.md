# NodeSeek X

用于增强 NodeSeek/DeepFlood 论坛体验的用户脚本。

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| **自动签到** | 每日自动完成签到 |
| **下拉加载** | 滚动到底部自动加载更多内容，动态加载的帖子仍支持头像用户卡片交互 |
| **快捷评论** | 通过快捷按钮呼出底部悬浮编辑器，引用、回复或编辑评论时自动打开 |
| **内容过滤** | 屏蔽指定用户/关键词帖子 |
| **等级标记** | 显示用户注册天数和等级徽章 |
| **浏览历史** | 记录并管理浏览过的帖子 |
| **编辑器增强** | 快捷插入 Callout/Tabs/折叠面板，并支持快捷键发帖 |
| **图片预览** | 幻灯片式图片查看 |
| **代码高亮** | 代码块语法高亮，支持 Mermaid 渲染及一键复制 |
| **已访问链接** | 自定义已访问链接颜色 |
| **链接净化** | 过滤追踪参数、去跳板直连与短链解析，支持 [DSL 规则定制](docs/link_purifier_dsl.md) |
| **回帖足迹** | 在列表页展示已回帖楼层，支持多账号互斥锁同步与断点续传 |
| **图床上传** | 支持粘贴/拖拽多图并发上传至 NodeImage、Chevereto、LskyPro、EasyImages、Telegraph 等图床 |
| **新标签页打开** | 自定义列表及帖子链接在新标签页或当前页面打开 |
| **用户卡片扩展** | 显示 @我、私信、回复的未读数，支持跨标签页同步及新消息标题滚动提醒 |
| **深色模式** | 自动适配网站深色模式 |
## 📦 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或其他用户脚本管理器
2. [点击安装脚本](https://github.com/NodeSeekX/userscript/raw/main/dist/NodeSeekX.user.js)

## ⚙️ 配置

点击浏览器 **Tampermonkey 扩展图标** → **高级设置** 打开设置面板，可自由开关各项功能。

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build
```

## 📁 项目结构

```
src/
├── app.js          # 应用入口
├── core.js         # 核心模块（事件总线、DOM 监听）
├── meta.user.js    # 用户脚本元信息
└── features/       # 功能模块
    ├── autoLoading.js    # 下拉加载
    ├── signIn.js         # 自动签到
    ├── quickComment.js   # 快捷评论
    ├── history.js        # 浏览历史
    ├── editorEnhance.js  # 编辑器增强 (Callout/Tabs/快捷键)
    ├── menus.js          # 设置面板
    └── ...
```

## 📄 许可证

[GPL-3.0](LICENSE)

## 🔗 链接

- [完整功能说明](DESCRIPTION.md)
- [更新日志](CHANGELOG.md)
- [讨论帖](https://www.nodeseek.com/post-36263-1)
- [问题反馈](https://github.com/NodeSeekX/userscript/issues)
