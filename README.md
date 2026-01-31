# NodeSeek X

用于增强 NodeSeek/DeepFlood 论坛体验的用户脚本。

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| **自动签到** | 每日自动完成签到 |
| **下拉加载** | 滚动到底部自动加载更多内容 |
| **快速评论** | 快捷输入常用评论语 |
| **内容过滤** | 屏蔽指定用户/关键词帖子 |
| **等级标记** | 显示用户注册天数和等级徽章 |
| **浏览历史** | 记录并管理浏览过的帖子 |
| **Callout 渲染** | 支持 Obsidian 风格 Callout 语法 |
| **图片预览** | 幻灯片式图片查看 |
| **代码高亮** | 代码块语法高亮与一键复制 |
| **已访问链接** | 自定义已访问链接颜色 |
| **深色模式** | 自动适配网站深色模式 |
| **快捷键** | Ctrl+Enter 快速提交等 |

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
    ├── quickComment.js   # 快速评论
    ├── history.js        # 浏览历史
    ├── callout.js        # Callout 渲染
    ├── menus.js          # 设置面板
    └── ...
```

## 📄 许可证

[GPL-3.0](LICENSE)

## 🔗 链接

- [讨论帖](https://www.nodeseek.com/post-36263-1)
- [问题反馈](https://github.com/NodeSeekX/userscript/issues)
