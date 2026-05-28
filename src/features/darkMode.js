// 暗色模式样式切换
export default {
    id: "darkMode",
    order: 180,
    init(ctx) {
        const body = document.body;
        if (!body) return;

        const apply = () => {
            const dark = body.classList.contains("dark-layout");
            // 为 html 添加/移除 .dark 类以触发 layui 深色主题
            document.documentElement.classList.toggle("dark", dark);
        };
        apply();
        new MutationObserver(() => apply()).observe(body, { attributes: true, attributeFilter: ["class"] });
    }
};
