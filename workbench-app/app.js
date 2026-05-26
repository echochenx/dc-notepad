// DC 悬浮记事本 - 工作台版本
// 适配 DC Storage API

// ========== 配置 ==========
const STORAGE_KEY = 'dc_notepad_notes_v1';
const CONFIG_KEY = 'dc_notepad_config_v1';

// 默认分类
const DEFAULT_CATEGORIES = {
  todo: { name: '待办', icon: '✅', color: '#10B981', keywords: ['要做','完成','跟进','提醒','记得','待办','TODO','todo','需要','必须'] },
  info: { name: '临时信息', icon: '🔑', color: '#F59E0B', keywords: ['key','token','密码','账号','api','secret','pwd'] },
  meeting: { name: '会议', icon: '📋', color: '#3B82F6', keywords: ['会议','讨论','对齐','评审','周会','站会'] },
  idea: { name: '灵感', icon: '💡', color: '#8B5CF6', keywords: ['想法','试试','能不能','如果','可以考虑','灵感'] },
  question: { name: '疑问', icon: '❓', color: '#F97316', keywords: ['为什么','怎么','如何','不懂','疑问'] },
  other: { name: '其他', icon: '📌', color: '#9CA3AF', keywords: [] }
};

// ========== 状态 ==========
let notes = [];
let currentCategory = 'all';
let aiConfig = { enabled: false, host: '127.0.0.1', port: 9999, apiKey: '', model: 'glm-5-external' };

// ========== 存储适配层 ==========
const Storage = {
  // 检测是否在 DC 工作台环境
  isDCWorkbench() {
    return typeof dchat !== 'undefined' && dchat.storage;
  },

  async get(key) {
    try {
      if (this.isDCWorkbench()) {
        return await dchat.storage.get(key);
      }
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('读取失败:', e);
      return null;
    }
  },

  async set(key, value) {
    try {
      if (this.isDCWorkbench()) {
        await dchat.storage.set(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (e) {
      console.error('保存失败:', e);
      return false;
    }
  }
};

// ========== 分类逻辑 ==========
function classifyLocally(content) {
  for (const [id, cat] of Object.entries(DEFAULT_CATEGORIES)) {
    if (id === 'other') continue;
    for (const keyword of cat.keywords) {
      if (content.includes(keyword)) return id;
    }
  }
  return 'other';
}

async function classifyWithAI(content) {
  if (!aiConfig.enabled || !aiConfig.apiKey) {
    return { success: false, category: classifyLocally(content) };
  }

  try {
    const response = await fetch(`http://${aiConfig.host}:${aiConfig.port}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是一个笔记分类助手。请分析内容，分类为以下之一：todo(待办)、info(临时信息)、meeting(会议)、idea(灵感)、question(疑问)、other(其他)。只返回分类ID。'
          },
          { role: 'user', content }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error('API 请求失败');
    
    const result = await response.json();
    const category = result.choices?.[0]?.message?.content?.trim().toLowerCase() || 'other';
    
    return { success: true, category: DEFAULT_CATEGORIES[category] ? category : 'other' };
  } catch (e) {
    console.error('AI 分类失败:', e);
    return { success: false, category: classifyLocally(content) };
  }
}

// ========== 笔记操作 ==========
async function loadNotes() {
  const data = await Storage.get(STORAGE_KEY);
  notes = data || [];
  renderNotes();
}

async function saveNotes() {
  await Storage.set(STORAGE_KEY, notes);
}

async function addNote(content) {
  if (!content.trim()) return;

  // 分类
  const result = await classifyWithAI(content);
  const type = result.category;

  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    content: content.trim(),
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  notes.unshift(note);
  await saveNotes();
  renderNotes();
  
  document.getElementById('note-input').value = '';
  showToast(`已保存到 ${DEFAULT_CATEGORIES[type].icon} ${DEFAULT_CATEGORIES[type].name}`);
}

async function deleteNote(id) {
  if (!confirm('确定删除这条笔记？')) return;
  notes = notes.filter(n => n.id !== id);
  await saveNotes();
  renderNotes();
  showToast('已删除');
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  let filtered = notes;

  // 分类筛选
  if (currentCategory !== 'all') {
    filtered = filtered.filter(n => n.type === currentCategory);
  }

  // 搜索筛选
  if (searchTerm) {
    filtered = filtered.filter(n => n.content.toLowerCase().includes(searchTerm));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">还没有笔记，开始记录吧！</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(note => {
    const cat = DEFAULT_CATEGORIES[note.type] || DEFAULT_CATEGORIES.other;
    const time = formatTime(note.createdAt);
    
    return `
      <div class="note-item" data-id="${note.id}">
        <div class="note-header">
          <span class="note-category" style="background:${cat.color}20;color:${cat.color}">
            ${cat.icon} ${cat.name}
          </span>
          <span class="note-time">${time}</span>
        </div>
        <div class="note-content">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>
        <div class="note-actions">
          <button onclick="copyNote('${note.id}')">📋 复制</button>
          <button class="btn-delete" onclick="deleteNote('${note.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function copyNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    navigator.clipboard.writeText(note.content);
    showToast('已复制到剪贴板');
  }
}

// ========== 设置 ==========
async function loadConfig() {
  const config = await Storage.get(CONFIG_KEY);
  if (config) {
    aiConfig = { ...aiConfig, ...config.ai };
  }
  updateSettingsUI();
}

async function saveConfig() {
  await Storage.set(CONFIG_KEY, { ai: aiConfig });
}

function updateSettingsUI() {
  document.getElementById('ai-enabled').checked = aiConfig.enabled;
  document.getElementById('ai-host').value = aiConfig.host;
  document.getElementById('ai-port').value = aiConfig.port;
  document.getElementById('ai-apikey').value = aiConfig.apiKey;
  document.getElementById('ai-model').value = aiConfig.model;
  
  document.getElementById('ai-config').style.display = aiConfig.enabled ? 'block' : 'none';
}

// ========== 工具函数 ==========
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ========== 事件绑定 ==========
function setupEventListeners() {
  // 保存笔记
  document.getElementById('btn-save').addEventListener('click', () => {
    const content = document.getElementById('note-input').value;
    addNote(content);
  });

  // 回车保存
  document.getElementById('note-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      addNote(e.target.value);
    }
  });

  // 搜索
  document.getElementById('search-input').addEventListener('input', renderNotes);

  // 分类切换
  document.getElementById('category-tabs').addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      renderNotes();
    }
  });

  // 设置面板
  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('settings-panel').style.display = 'block';
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    document.getElementById('settings-panel').style.display = 'none';
  });

  // AI 开关
  document.getElementById('ai-enabled').addEventListener('change', (e) => {
    aiConfig.enabled = e.target.checked;
    document.getElementById('ai-config').style.display = e.target.checked ? 'block' : 'none';
    saveConfig();
  });

  // AI 配置
  ['ai-host', 'ai-port', 'ai-apikey', 'ai-model'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('ai-', '');
      aiConfig[key] = e.target.value;
      saveConfig();
    });
  });

  // 测试 AI
  document.getElementById('btn-test-ai').addEventListener('click', async () => {
    showToast('测试中...');
    const result = await classifyWithAI('这是一个测试');
    showToast(result.success ? `✅ 连接成功: ${result.category}` : '❌ 连接失败');
  });

  // 剪贴板
  document.getElementById('btn-clipboard').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        document.getElementById('note-input').value += text;
        showToast('已粘贴');
      }
    } catch (e) {
      showToast('无法读取剪贴板');
    }
  });

  // 语音输入
  document.getElementById('btn-voice').addEventListener('click', () => {
    if (!('webkitSpeechRecognition' in window)) {
      showToast('浏览器不支持语音识别');
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.onstart = () => showToast('🎤 正在听...');
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      document.getElementById('note-input').value += text;
    };
    recognition.start();
  });

  // 导出
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dc-notepad-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('已导出');
  });

  // 导入
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          notes = [...imported, ...notes];
          await saveNotes();
          renderNotes();
          showToast(`已导入 ${imported.length} 条笔记`);
        }
      } catch (err) {
        showToast('导入失败：格式错误');
      }
    };
    reader.readAsText(file);
  });
}

// ========== 初始化 ==========
async function init() {
  await loadConfig();
  await loadNotes();
  setupEventListeners();
  
  console.log('DC 悬浮记事本已加载');
  console.log('环境:', Storage.isDCWorkbench() ? 'DC 工作台' : '浏览器');
}

init();
