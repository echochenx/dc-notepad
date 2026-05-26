# DC 悬浮记事本 - 项目记忆

## 项目概述

一个始终置顶的悬浮记事本，解决「把临时信息打在自己 DC 聊天框导致杂乱难找」的痛点。

## 关键决策

| 时间 | 决策 | 说明 |
|------|------|------|
| 2026-05-23 | 产品形态：Chrome Extension | 初版方案 |
| 2026-05-24 | **改为 Electron 桌面应用** | 用户使用 DC Mac 客户端，Extension 无法注入原生应用 |
| 2026-05-24 | 数据存储：本地文件 | 路径 `~/Library/Application Support/dc-notepad/` |
| 2026-05-24 | AI 分类：LiteLLM | 地址 `127.0.0.1:9999`，模型 `glm-5-external` |
| 2026-05-24 | 窗口特性：alwaysOnTop | 始终置顶，悬浮在 DC 客户端上方 |

## 技术栈

- Electron 28
- 原生 Node.js HTTP 调用 LLM
- 本地 JSON 文件存储
- Web Speech API 语音转文字

## 项目结构

```
dc-notepad/
├── README.md              # 完整方案文档
├── MEMORY.md              # 本文件
├── extension/             # (废弃) Chrome 扩展代码
└── electron/              # Electron 应用
    ├── package.json
    ├── src/
    │   ├── main.js        # 主进程
    │   └── renderer/      # 渲染进程 (UI)
    └── README.md
```

## 待办事项

- [x] 创建 Electron 项目结构
- [x] 编写主进程（窗口、托盘、快捷键、IPC）
- [x] 迁移 UI 代码
- [x] 集成 LiteLLM 分类
- [x] 安装依赖并测试运行
- [x] 打包为 .app 并测试
- [ ] 分享给同事试用

### 2026-05-26 Electron 打包完成

**打包产物：**
| 文件 | 路径 | 大小 |
|------|------|------|
| .app 应用 | `electron/dist/mac-arm64/DC 悬浮记事本.app` | ~90MB |
| zip 安装包 | `electron/dist/DC 悬浮记事本-1.1.0-arm64-mac.zip` | 86MB |

**使用方式：**
1. 直接使用: `open electron/dist/mac-arm64/DC\ 悬浮记事本.app`
2. 分享 zip: 发送 zip 文件给同事解压使用

**注意事项：**
- dmg 打包在当前环境受限（hdiutil 权限），但 zip 完全可用
- 如需 dmg 可在本机运行 `npm run build:mac`

## 版本记录

### v1.0.0 Electron 版 (2026-05-24)
- 改为 Electron 桌面应用
- alwaysOnTop 始终置顶
- 托盘图标 + 全局快捷键 Alt+N
- 复用原有 UI 和分类逻辑
- LiteLLM 配置：127.0.0.1:9999, glm-5-external

### v1.0.0 MVP Chrome Extension (2026-05-23)
- (已废弃) 初版 Chrome Extension 方案

### v1.1.0 双模式分类 (2026-05-25)
- 默认使用本地关键词分类（开箱即用，无需配置）
- AI 智能分类改为可选配置
- 新增 AI 设置面板（设置 → AI 分类设置）
- 可开关 AI 功能，配置 LiteLLM 服务地址和 API Key
- 支持测试 AI 连接
- 修复 Smartwork 配置中硬编码示例密钥问题

## 同事使用指南

### 零配置开箱即用
1. 下载 `.dmg` 安装包
2. 拖到「应用程序」文件夹
3. 双击运行，Alt+N 呼出
4. 直接记笔记，自动本地关键词分类

### 可选：启用 AI 智能分类
1. 点击设置 → AI 分类设置
2. 勾选「启用 AI 智能分类」
3. 填写 LiteLLM 地址、API Key、模型名称
4. 点击「测试」验证连接
5. 保存配置

## 多平台支持

| 平台 | 快捷键 | 打包命令 |
|------|--------|----------|
| Mac | Alt+N | `npm run build:mac` |
| Windows | Ctrl+Shift+N | `npm run build:win` |
| Linux | Ctrl+Shift+N | `npm run build:linux` |

### Windows/Linux 打包说明
- Windows 打包需要 Windows 系统或 Wine
- Linux 打包在 Mac 上可能依赖问题
- 建议：在对应系统上执行打包命令

## 2026-05-26 更新：DC 工作台版本

### 新增工作台应用

为接入 DC 应用工作台，创建了 `workbench-app/` 目录：

```
workbench-app/
├── manifest.json      # 应用配置
├── index.html         # H5 入口
├── app.js             # 核心逻辑（适配 DC Storage）
├── styles.css         # 样式
├── icons/             # 图标目录
└── README.md          # 上架指南
```

### 技术适配

1. **存储层抽象** (`Storage` 对象)
   - 自动检测 DC 工作台环境
   - DC 环境使用 `dchat.storage` API
   - 浏览器环境使用 `localStorage`

2. **功能调整**
   - 移除 alwaysOnTop（工作台内嵌）
   - 移除全局快捷键（改为工作台入口）
   - 保留 AI 分类（需配置）
   - 新增数据导入/导出功能

### 上架准备清单

- [ ] 准备 240×240px 图标
- [ ] 部署到可访问服务器
- [ ] 在 io.xiaojukeji.com 创建应用
- [ ] 申请 storage + clipboard 权限
- [ ] 提交审核

### 部署建议

推荐使用 OE 平台部署，方便内网访问。

### 2026-05-26 图标生成

使用 SVG + Playwright 截图方式生成应用图标：

```
workbench-app/icons/
├── icon.svg           # 源文件 (SVG)
├── icon_64.png        # 64×64 (3.5 KB)
├── icon_128.png       # 128×128 (9.6 KB)
├── icon_240.png       # 240×240 (12.9 KB) ✅ 上架必需
└── preview.html       # 图标预览页面
```

**设计说明：**
- 背景：绿色渐变 (#10B981 → #059669)
- 主体：白色记事本图形
- 点缀：橙色便签角标 (#F97316)
- 元素：文本行 + 勾选标记

所有图标均符合 DC 上架要求（<200KB）。

### 2026-05-26 图标重新设计（DC 风格）

根据 DC 图标风格重新设计应用图标：

**设计对比：**
| 元素 | 第一版 | 新版（DC风格）|
|------|--------|--------------|
| 背景色 | 绿色渐变 #10B981 | 暖橙渐变 #FF6B35 |
| 轮廓 | 圆角矩形 | 大圆角矩形（呼应 DC）|
| 主体 | 便签+角标 | 记事本纸张 |
| 细节 | 文本行+勾选 | 装订孔+文本行+勾选框 |
| 风格 | 工具类 | DC 品牌一致性 |

**设计元素说明：**
- 🔶 背景：DC 品牌暖橙色渐变 (#FF6B35 → #FF8F5C)
- 📄 主体：白色圆角记事本纸张
- 🔘 顶部：5 个装订孔（真实记事本隐喻）
- 📝 内容：4 行文本线（长短不一，模拟真实笔记）
- ✅ 底部：橙色待办勾选框（凸显功能特点）
- ✨ 装饰：右上角半透明白色圆点（呼应 DC 图标风格）

**文件结构：**
```
icons/
├── icon_240.png      # 新版 (10.6 KB) ⭐ 上架使用
├── icon_128.png      # 新版 (9.2 KB)
├── icon_64.png       # 新版 (3.1 KB)
├── icon_240_v1.png   # 第一版备份
├── icon_dc_style.svg # SVG 源文件
└── preview_dc_style.html # 对比预览
```

**规格检查：** ✅ 240×240px, PNG, 10.6KB (<200KB)
