const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const dataPath = path.join(app.getPath('userData'), 'notes.json');

// DC Logo SVG Data URL
const DC_LOGO_SVG = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#F97316"/></linearGradient></defs><rect x="10" y="10" width="80" height="80" rx="20" fill="url(#g)"/><path d="M50 72 L28 48 Q23 42 28 37 Q34 32 40 38 L50 52 L60 38 Q66 32 72 37 Q77 42 72 48 Z" fill="white"/></svg>`).toString('base64')}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 48,
    height: 48,
    x: 20,
    y: 80,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    focusable: true,
    icon: nativeImage.createFromDataURL(DC_LOGO_SVG),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blur');
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromDataURL(DC_LOGO_SVG).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示记事本', click: () => mainWindow && mainWindow.show() },
    { label: '隐藏记事本', click: () => mainWindow && mainWindow.hide() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('DC 悬浮记事本');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function registerShortcut() {
  const isMac = process.platform === 'darwin';
  const shortcut = isMac ? 'Alt+N' : 'Control+Shift+N';
  const ret = globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  if (!ret) console.error('快捷键注册失败');
}

ipcMain.handle('read-notes', async () => {
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error('读取笔记失败:', e);
    return [];
  }
});

ipcMain.handle('save-notes', async (event, notes) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(notes, null, 2));
    return true;
  } catch (e) {
    console.error('保存笔记失败:', e);
    return false;
  }
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
    if (width > 100) {
      mainWindow.setAlwaysOnTop(true, 'floating');
      mainWindow.focus();
    } else {
      mainWindow.setAlwaysOnTop(true, 'normal');
    }
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-hide', () => {
  if (mainWindow) mainWindow.hide();
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcut();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('before-quit', () => isQuitting = true);

// 分类配置存储路径
const categoriesPath = path.join(app.getPath('userData'), 'categories.json');

// IPC: 读取分类
ipcMain.handle('read-categories', async () => {
  try {
    if (fs.existsSync(categoriesPath)) {
      const data = fs.readFileSync(categoriesPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('读取分类失败:', e);
    return null;
  }
});

// IPC: 保存分类
ipcMain.handle('save-categories', async (event, categories) => {
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    return true;
  } catch (e) {
    console.error('保存分类失败:', e);
    return false;
  }
});

// Smartwork 配置存储
const smartworkConfigPath = path.join(app.getPath('userData'), 'smartwork-config.json');

ipcMain.handle('read-smartwork-config', async () => {
  try {
    if (fs.existsSync(smartworkConfigPath)) {
      const data = fs.readFileSync(smartworkConfigPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('读取 Smartwork 配置失败:', e);
    return null;
  }
});

ipcMain.handle('save-smartwork-config', async (event, config) => {
  try {
    fs.writeFileSync(smartworkConfigPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('保存 Smartwork 配置失败:', e);
    return false;
  }
});

// AI 分类配置存储
const aiConfigPath = path.join(app.getPath('userData'), 'ai-config.json');

ipcMain.handle('read-ai-config', async () => {
  try {
    if (fs.existsSync(aiConfigPath)) {
      const data = fs.readFileSync(aiConfigPath, 'utf-8');
      return JSON.parse(data);
    }
    return { enabled: false, host: '127.0.0.1', port: 9999, apiKey: '', model: 'glm-5-external' };
  } catch (e) {
    console.error('读取 AI 配置失败:', e);
    return { enabled: false, host: '127.0.0.1', port: 9999, apiKey: '', model: 'glm-5-external' };
  }
});

ipcMain.handle('save-ai-config', async (event, config) => {
  try {
    fs.writeFileSync(aiConfigPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('保存 AI 配置失败:', e);
    return false;
  }
});

// LiteLLM AI 分类
const http = require('http');

ipcMain.handle('classify-with-ai', async (event, content) => {
  try {
    const config = JSON.parse(fs.readFileSync(aiConfigPath, 'utf-8') || '{}');
    if (!config.enabled || !config.apiKey) {
      return { success: false, error: 'AI 分类未启用或未配置' };
    }

    const postData = JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个笔记分类助手。请分析用户输入的内容，将其分类为以下之一：todo(待办)、info(临时信息)、meeting(会议)、idea(灵感)、question(疑问)、other(其他)。只返回分类ID，不要其他解释。'
        },
        { role: 'user', content: content }
      ],
      temperature: 0.3
    });

    const options = {
      hostname: config.host,
      port: config.port,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const category = result.choices?.[0]?.message?.content?.trim().toLowerCase() || 'other';
            resolve({ success: true, category: category });
          } catch (e) {
            resolve({ success: false, error: '解析响应失败' });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});
