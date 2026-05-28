# DC 悬浮记事本

始终置顶的轻量记事本，快速记录临时信息、待办事项、灵感想法。

## 功能特性

- ✅ 分类标记：待办、会议、灵感、临时信息等
- ✅ AI 智能分类：可选功能，自动识别笔记类型
- ✅ 本地存储：数据保存在本地，安全隐私
- ✅ 双端支持：H5 网页版 + Electron 桌面版

## 在线访问

GitHub Pages: https://echochenx.github.io/dc-notepad/

## 项目结构

```
dc-notepad/
├── index.html      # H5 入口
├── app.js          # 核心逻辑
├── styles.css      # 样式
├── icons/          # 图标资源
├── electron/       # Electron 桌面版
├── MEMORY.md       # 项目记忆
└── README.md       # 本文档
```

## 本地运行

```bash
# 方式1：Python
python3 -m http.server 8080

# 方式2：Node.js
npx serve .
```

然后访问 http://localhost:8080

## 版本历史

- v1.2.4 - 渐进式重构，清理无用文件
- v1.2.3 - 修复语法错误，解决按钮失效问题
- v1.2.2 - 添加 init() 调用，修复事件绑定
- v1.2.1 - 优化 AI 测试失败提示
- v1.2.0 - 新增自动创建 DC 待办功能
- v1.1.1 - 修复 AI 设置乱码问题
- v1.1.0 - 支持本地关键词 + AI 智能分类

## 作者

chenjiajia

## License

MIT
