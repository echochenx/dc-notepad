# DC 悬浮记事本 - 工作台版本

## 简介

DC 工作台应用版本的悬浮记事本，支持在 DC 应用商店上架。

## 与 Electron 版本的区别

| 特性 | Electron 版 | 工作台版 |
|------|------------|----------|
  | 运行环境 | 桌面独立应用 | DC 工作台内嵌 |
  | 快捷键 | Alt+N 全局 | 工作台入口 |
  | 数据存储 | 本地 JSON | DC Storage API |
  | 悬浮置顶 | ✅ alwaysOnTop | ❌ 工作台内 |
  | AI 分类 | 本地调用 | 支持（需配置） |

## 文件结构

```
workbench-app/
├── manifest.json      # 应用配置
├── index.html         # 入口页面
├── app.js             # 主逻辑
├── styles.css         # 样式
├── icons/             # 应用图标
│   ├── icon_64.png
│   ├── icon_128.png
│   └── icon_240.png   # 上架必需
└── README.md
```

## 上架步骤

1. 访问 https://io.xiaojukeji.com
2. 进入「我的应用」→「创建应用」
3. 选择「网页应用 (H5)」
4. 填写应用信息：
   - 名称：DC悬浮记事本
   - 描述：随时记录灵感、待办、临时信息，支持AI智能分类
   - 图标：上传 icons/icon_240.png
5. 配置 H5 能力：
   - 入口地址：部署后的 URL
   - 窗口尺寸：400×600（可调整）
6. 申请接口权限：storage, clipboard
7. 提交审核

## 图标要求

需要准备 240×240px 的 PNG 图标，大小 < 200KB。

## 本地测试

```bash
# 使用任意静态服务器
cd workbench-app
npx serve .

# 或 Python
python3 -m http.server 8080
```

然后访问 http://localhost:8080

## 部署

需要将应用部署到可访问的服务器，推荐使用：
- OE 平台
- GitHub Pages
- 公司内网服务器
