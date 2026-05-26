# DC 悬浮记事本 - Chrome Extension

## 功能特性

- 📝 **快速记录**：文字、截图（Ctrl+V）、语音、剪贴板一键录入
- 🤖 **AI 自动分类**：调用 LiteLLM 智能归类（待办/临时信息/会议/灵感/疑问/其他）
- 🔍 **快速找回**：全文搜索 + 分类筛选 + 时间线浏览
- 🎨 **精美 UI**：毛玻璃风格，彩色分类标签
- ⌨️ **快捷键**：Alt+N 快速唤起/隐藏
- 🔒 **本地存储**：数据保存在浏览器本地，隐私安全

## 安装方法

### 方式一：开发者模式安装（推荐）

1. 打开 Chrome 浏览器，地址栏输入 `chrome://extensions`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本文件夹（`extension`）
5. 安装成功，在 DC Web 页面左上角会出现 📝 悬浮按钮

### 方式二：打包安装

1. 在 `chrome://extensions` 页面点击「打包扩展程序」
2. 选择本文件夹，生成 `.crx` 和 `.pem` 文件
3. 将 `.crx` 文件拖入 `chrome://extensions` 页面即可安装

## 配置 LiteLLM

编辑 `background/background.js` 文件，修改以下配置：

```javascript
const response = await fetch('http://127.0.0.1:8000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 你的API密钥'
  },
  body: JSON.stringify({
    model: '你的模型名称',
    // ...
  })
});
```

如果 LiteLLM 未配置或调用失败，会自动降级到本地规则引擎进行分类。

## 使用方法

| 操作 | 说明 |
|------|------|
| `Alt + N` | 快速唤起/隐藏记事本 |
| 输入文字 + `Enter` | 保存为笔记 |
| `Ctrl + V` | 粘贴截图 |
| 🎤 按钮 | 语音输入（转文字） |
| 📋 按钮 | 读取剪贴板内容 |
| 分类标签 | 点击筛选不同类型笔记 |
| 搜索框 | 全文搜索笔记内容 |

## 文件结构

```
extension/
├── manifest.json          # 扩展配置
├── background/
│   └── background.js      # Service Worker，处理 LLM 调用
├── content_scripts/
│   ├── notepad.js         # 主逻辑
│   └── notepad.css        # 样式
├── icons/                 # 图标（可添加）
└── README.md              # 本文件
```

## 注意事项

- 需要 DC Web 版（https://im.xiaojukeji.com）
- 语音输入需要浏览器支持 Web Speech API
- 截图粘贴需要页面获得剪贴板权限
- 数据存储在浏览器本地，换电脑/清缓存会丢失

## 开发计划

- [x] Phase 1 MVP：基础记录 + LLM 分类 + 本地存储
- [ ] Phase 2：语音输入完善、置顶功能、数据导出
- [ ] Phase 3：提醒功能、Smartwork 待办同步
