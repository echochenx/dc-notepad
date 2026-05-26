const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { smartwork } = require("./smartwork");

// 默认分类配置
const DEFAULT_CATEGORIES = {
  todo: { name: '待办', icon: '✅', color: '#10B981', keywords: ['要做','完成','跟进','提醒','记得','待办','TODO','todo','需要','必须','记得做','别忘了','记得去','要去','得去','安排','计划','准备','下周','明天','今天','今晚','发给','提交','回复','确认','核对','检查','整理','写','发','改','修','弄','处理','解决','联系'], patterns: [/要.+做/,/需要.+完成/,/记得.+去/,/别忘了/,/待办/,/TODO/i,/记得.+发/,/记得.+回/,/记得.+写/,/记得.+改/,/记得.+联系/,/记得.+检查/,/记得.+确认/,/下周.+做/,/明天.+做/,/今天.+做/,/下午.+做/,/上午.+做/,/晚上.+做/,/点之前/,/之前完成/,/之前做完/,/号之前/] },
  info: { name: '临时信息', icon: '🔑', color: '#F59E0B', keywords: ['key','token','密码','账号','api','secret','pwd','passwd','apikey','access','credential','密钥','口令','验证码','code','id','url','地址','链接','网址','http','https','ip','IP','端口','host','用户名','username','账户','登录','login','授权','auth'], patterns: [/api[_-]?key/i,/access[_-]?token/i,/secret[_-]?key/i,/password/i,/账号[：:]\s*\S/,/密码[：:]\s*\S/,/key[：:]\s*\S/i,/token[：:]\s*\S/i,/ID[：:]\s*\S/,/验证码/,/\d{4,}.*验证/,/https?:\/\/\S+/,/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/] },
  meeting: { name: '会议', icon: '📋', color: '#3B82F6', keywords: ['会议','讨论','对齐','评审','周会','站会','meeting','会','开会','参会','参加','讨论会','评审会','沟通会','同步','sync','会议纪要','会议记录','meeting notes','培训','分享','演示','demo','showcase'], patterns: [/.+会议/,/会议.+/,/.+评审/,/评审.+/,/.+对齐/,/对齐.+/,/.+讨论/,/讨论.+/,/周会/,/站会/,/培训/,/分享会/,/演示/,/showcase/i,/sync.+/i,/meeting/i,/会议室/,/参会/,/开会/,/线下会/,/线上会/] },
  idea: { name: '灵感', icon: '💡', color: '#8B5CF6', keywords: ['想法','试试','能不能','如果','也许','可以考虑','灵感','思路','点子','建议','方案','优化','改进','尝试','测试','实验','新功能','feature','idea','想到','可以','要不要','是不是','或者'], patterns: [/想法[：:]?/,/思路[：:]?/,/灵感/,/可以尝试/,/可以考虑/,/试试看/,/能不能/,/要不要/,/如果.+就/,/也许.+可以/,/或许.+可以/,/想到一个/,/有个想法/,/有个点子/,/建议.+/,/优化.+/,/改进.+/,/新功能/,/idea/i] },
  question: { name: '疑问', icon: '❓', color: '#F97316', keywords: ['为什么','怎么','如何','不懂','疑问','问一下','请教','求助','问题','疑惑','困惑','不太懂','不明白','什么是','啥是','咋回事','怎么办','咋办','why','how','what','question','?','？'], patterns: [/为什么.+/,/怎么.+?\?/,/如何.+/,/不懂/,/不明白/,/不太懂/,/有问题/,/疑问/,/请教/,/求助/,/问一下/,/啥是/,/什么是/,/咋回事/,/怎么办/,/咋办/,/why/i,/how to/i,/\?\s*$/,/？\s*$/] },
  other: { name: '其他', icon: '📌', color: '#9CA3AF', keywords: [], patterns: [] }
};

// 图标选项
const ICON_OPTIONS = ['✅','🔑','📋','💡','❓','📌','📝','🔔','📅','📊','🎯','🚀','⭐','🔥','💬','📎','🔖','📍','✏️','🗑️','🎨','🎵','📷','🎬','📚','💰','🔧','🎮','🏃','🍎','☕','✈️','🏠','👥','📞','📧','🔗','⚡','🌟','💎','🎁','🎉','🚩','⏰','📢','🛠️','🔍','📈','🎓','🌈'];

// 颜色选项
const COLOR_OPTIONS = ['#10B981','#F59E0B','#3B82F6','#8B5CF6','#F97316','#9CA3AF','#EF4444','#EC4899','#06B6D4','#84CC16','#F43F5E','#6366F1','#14B8A6','#EAB308','#A855F7','#64748B'];

let notes = [];
let categories = {};
let currentCategory = 'all';
let isExpanded = false;
let editingCategoryId = null;

// 初始化
async function init() {
  // 加载分类配置
  const savedCategories = await ipcRenderer.invoke('read-categories');
  categories = savedCategories || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  
  notes = await ipcRenderer.invoke('read-notes');
  renderTabs();
  renderNotes();
  setupEventListeners();
  showFabMode();
}

// 显示悬浮球模式
function showFabMode() {
  isExpanded = false;
  document.getElementById('fab-container').style.display = 'flex';
  document.getElementById('app').classList.remove('expanded');
  document.getElementById('settings-panel').classList.remove('expanded');
  ipcRenderer.send('resize-window', { width: 48, height: 48 });
}

// 显示主面板模式
function showPanelMode() {
  isExpanded = true;
  document.getElementById('fab-container').style.display = 'none';
  document.getElementById('app').classList.add('expanded');
  document.getElementById('settings-panel').classList.remove('expanded');
  ipcRenderer.send('resize-window', { width: 380, height: 560 });
  document.getElementById('note-input').focus();
  renderNotes();
}

// 显示设置面板
function showSettingsMode() {
  isExpanded = true;
  document.getElementById('fab-container').style.display = 'none';
  document.getElementById('app').classList.remove('expanded');
  document.getElementById('settings-panel').classList.add('expanded');
  ipcRenderer.send('resize-window', { width: 380, height: 560 });
  renderCategorySettings();
}

// 渲染分类标签
function renderTabs() {
  const tabsContainer = document.getElementById('category-tabs');
  let html = '<button class="tab active" data-category="all">📁 全部</button>';
  
  for (const [id, cat] of Object.entries(categories)) {
    html += `<button class="tab ${id}" data-category="${id}">${cat.icon} ${cat.name}</button>`;
  }
  
  tabsContainer.innerHTML = html;
}

// 本地分类函数
function classifyLocally(content) {
  for (const [id, cat] of Object.entries(categories)) {
    if (id === 'other') continue;
    for (const keyword of cat.keywords || []) {
      if (content.includes(keyword)) return id;
    }
    for (const pattern of cat.patterns || []) {
      if (pattern.test(content)) return id;
    }
  }
  return 'other';
}

// 渲染笔记列表
function renderNotes(searchTerm = '') {
  const listEl = document.getElementById('notes-list');
  let filtered = notes;

  if (currentCategory !== 'all') {
    filtered = filtered.filter(n => n.type === currentCategory);
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(n =>
      n.content.toLowerCase().includes(term) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(term)))
    );
  }
  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">📝</div><div class="text">暂无笔记</div><div class="hint">按 Alt+N 快速记录</div></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(note => {
    const cat = categories[note.type] || categories.other;
    const time = formatTime(note.createdAt);
    let contentHtml = note.contentType === 'image'
      ? `<img src="${note.content}" class="note-image">`
      : `<div class="note-content">${escapeHtml(note.content)}</div>`;

    return `
      <div class="note-item ${note.type}" data-id="${note.id}">
        <div class="note-header">
          <span class="note-type ${note.type}" style="background: ${cat.color}20; color: ${cat.color}">${cat.icon} ${cat.name}</span>
          <div class="note-actions">
            <button class="note-action-btn" data-action="edit" data-id="${note.id}" title="编辑">✏️</button>
            <button class="note-action-btn" data-action="delete" data-id="${note.id}" title="删除">🗑️</button>
            <button class="note-action-btn" data-action="sync" data-id="${note.id}" title="同步到 Smartwork">📋</button>
            <button class="note-action-btn" data-action="pin" data-id="${note.id}" title="${note.pinned ? '取消置顶' : '置顶'}">${note.pinned ? '📌' : '📍'}</button>
          </div>
          <span class="note-time">${time}</span>
        </div>
        ${contentHtml}
        <div class="note-edit-area" id="edit-${note.id}" style="display:none">
          <textarea class="edit-textarea" id="edit-input-${note.id}">${note.contentType === 'image' ? '' : note.content}</textarea>
          <div class="edit-actions">
            <select class="edit-type-select" id="edit-type-${note.id}">
              ${Object.entries(categories).map(([key, val]) =>
                `<option value="${key}" ${note.type === key ? 'selected' : ''}>${val.icon} ${val.name}</option>`
              ).join('')}
            </select>
            <button class="edit-btn save" data-action="save-edit" data-id="${note.id}">保存</button>
            <button class="edit-btn cancel" data-action="cancel-edit" data-id="${note.id}">取消</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// 渲染分类设置
function renderCategorySettings() {
  const container = document.getElementById('category-list');
  let html = '';
  
  for (const [id, cat] of Object.entries(categories)) {
    html += `
      <div class="category-item" data-id="${id}">
        <div class="category-info">
          <span class="category-icon" style="background: ${cat.color}20; color: ${cat.color}">${cat.icon}</span>
          <span class="category-name">${cat.name}</span>
        </div>
        <div class="category-actions">
          <button class="cat-action-btn" data-action="edit-cat" data-id="${id}">✏️</button>
          ${id !== 'other' ? `<button class="cat-action-btn" data-action="delete-cat" data-id="${id}">🗑️</button>` : ''}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // 渲染编辑表单
  const editForm = document.getElementById('category-edit-form');
  if (editingCategoryId) {
    const cat = categories[editingCategoryId];
    editForm.style.display = 'block';
    document.getElementById('cat-id').value = editingCategoryId;
    document.getElementById('cat-name').value = cat.name;
    
    // 渲染图标选择
    document.getElementById('cat-icon-select').innerHTML = ICON_OPTIONS.map(icon => 
      `<span class="icon-option ${cat.icon === icon ? 'selected' : ''}" data-icon="${icon}">${icon}</span>`
    ).join('');
    
    // 渲染颜色选择
    document.getElementById('cat-color-select').innerHTML = COLOR_OPTIONS.map(color => 
      `<span class="color-option ${cat.color === color ? 'selected' : ''}" data-color="${color}" style="background: ${color}"></span>`
    ).join('');
    
    // 渲染关键词
    document.getElementById('cat-keywords').value = cat.keywords ? cat.keywords.join(',') : '';
  } else {
    editForm.style.display = 'none';
  }
}

// 添加新分类
async function addCategory() {
  const id = 'cat_' + Date.now();
  categories[id] = {
    name: '新分类',
    icon: '📝',
    color: '#10B981',
    keywords: [],
    patterns: []
  };
  await ipcRenderer.invoke('save-categories', categories);
  editingCategoryId = id;
  renderCategorySettings();
  renderTabs();
  showToast('已添加新分类');
}

// 保存分类
async function saveCategory() {
  const id = document.getElementById('cat-id').value;
  if (!id || !categories[id]) return;
  
  categories[id].name = document.getElementById('cat-name').value || '未命名';
  
  const selectedIcon = document.querySelector('#cat-icon-select .icon-option.selected');
  if (selectedIcon) categories[id].icon = selectedIcon.dataset.icon;
  
  const selectedColor = document.querySelector('#cat-color-select .color-option.selected');
  if (selectedColor) categories[id].color = selectedColor.dataset.color;
  
  const keywordsStr = document.getElementById('cat-keywords').value;
  categories[id].keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(k => k) : [];
  
  await ipcRenderer.invoke('save-categories', categories);
  editingCategoryId = null;
  renderCategorySettings();
  renderTabs();
  showToast('分类已保存');
}

// 删除分类
async function deleteCategory(id) {
  if (!confirm(`确定要删除分类 "${categories[id].name}" 吗？该分类下的笔记将移到"其他"。`)) return;
  
  // 将该分类的笔记移到 other
  notes.forEach(note => {
    if (note.type === id) note.type = 'other';
  });
  await ipcRenderer.invoke('save-notes', notes);
  
  delete categories[id];
  await ipcRenderer.invoke('save-categories', categories);
  renderCategorySettings();
  renderTabs();
  showToast('分类已删除');
}

// 添加笔记
async function addNote(content, contentType = 'text') {
  let type = contentType === 'image' ? 'meeting' : classifyLocally(content);
  if (!categories[type]) type = 'other';
  
  // 如果配置了 AI，尝试使用 AI 分类
  try {
    const aiConfig = await ipcRenderer.invoke('read-ai-config');
    if (aiConfig.enabled && aiConfig.apiKey && contentType !== 'image') {
      const aiResult = await ipcRenderer.invoke('classify-with-ai', content);
      if (aiResult.success && categories[aiResult.category]) {
        type = aiResult.category;
      }
    }
  } catch (e) {
    // AI 分类失败，使用本地分类（已设置）
  }
  
  const note = {
    id: generateId(), type, content, contentType,
    tags: extractTags(content), pinned: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  notes.unshift(note);
  await ipcRenderer.invoke('save-notes', notes);
  renderNotes();
  showToast(`已保存到 ${categories[type].icon}${categories[type].name}`);
  document.getElementById('note-input').value = '';
}

// 删除笔记
async function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  await ipcRenderer.invoke('save-notes', notes);
  renderNotes();
  showToast('已删除');
}

// 编辑笔记
function startEdit(id) {
  const editArea = document.getElementById(`edit-${id}`);
  if (editArea) editArea.style.display = 'block';
  const input = document.getElementById(`edit-input-${id}`);
  if (input) input.focus();
}

function cancelEdit(id) {
  const editArea = document.getElementById(`edit-${id}`);
  if (editArea) editArea.style.display = 'none';
}

async function saveEdit(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  const newContent = document.getElementById(`edit-input-${id}`)?.value.trim();
  const newType = document.getElementById(`edit-type-${id}`)?.value;
  if (newContent) note.content = newContent;
  if (newType && categories[newType]) note.type = newType;
  note.updatedAt = new Date().toISOString();
  await ipcRenderer.invoke('save-notes', notes);
  renderNotes();
  showToast('已更新');
}

// 置顶笔记
async function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  await ipcRenderer.invoke('save-notes', notes);
  renderNotes();
  showToast(note.pinned ? '已置顶' : '已取消置顶');
}

function extractTags(content) {
  const tags = [];
  const matches = content.match(/#[\w\u4e00-\u9fa5]+/g);
  if (matches) tags.push(...matches);
  return tags;
}

// 同步到 Smartwork
async function syncToSmartwork(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  
  // 检查是否已配置 Smartwork（需要 client_id, client_secret, bot_name）
  if (!smartwork.isConfigured()) {
    // 使用预配置的凭证（你可以直接使用）
    const useDefault = confirm('是否使用预配置的应用凭证？\n\n点击"确定"使用默认凭证\n点击"取消"手动输入');
    
    if (useDefault) {
      // 使用你提供的凭证
      await smartwork.saveConfig({
        clientId: 'a360e7e88cfb42898e39a2a678406f8e',
        clientSecret: 'ee0c7f6b3b7b42ec883d196aab19c77b',
        botType: 'official_account',
        botName: 'dc_notepad'  // 你需要创建这个服务号或使用已有的
      });
    } else {
      // 手动输入
      const clientId = prompt('请输入 Client ID:', 'a360e7e88cfb42898e39a2a678406f8e');
      if (!clientId) {
        showToast('❌ 未配置 Client ID');
        return;
      }
      
      const clientSecret = prompt('请输入 Client Secret:', 'ee0c7f6b3b7b42ec883d196aab19c77b');
      if (!clientSecret) {
        showToast('❌ 未配置 Client Secret');
        return;
      }
      
      const botName = prompt('请输入服务号名称（如: dc_notepad）:', 'dc_notepad');
      if (!botName) {
        showToast('❌ 未配置服务号名称');
        return;
      }
      
      await smartwork.saveConfig({
        clientId,
        clientSecret,
        botType: 'official_account',
        botName
      });
    }
  }
  
  try {
    showToast('正在同步到 Smartwork...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];
    
    const result = await smartwork.createTodo({
      title: note.content.slice(0, 100),
      content: note.content,
      dueDate: dueDate
    });
    
    showToast('✅ 已同步到 Smartwork 待办');
    
    note.smartworkId = result.id || result.todo_id || result.data?.id;
    note.syncedAt = new Date().toISOString();
    await ipcRenderer.invoke('save-notes', notes);
    renderNotes();
    
  } catch (error) {
    console.error('同步失败:', error);
    showToast('❌ 同步失败: ' + error.message);
    
    if (error.message.includes('401') || error.message.includes('403') || 
        error.message.includes('auth') || error.message.includes('permission')) {
      await smartwork.saveConfig({ clientId: '', clientSecret: '', botName: '' });
      showToast('凭证已失效，请重新配置');
    }
  }
}



function setupEventListeners() {
  // 悬浮球点击
  document.getElementById('fab-button').addEventListener('click', showPanelMode);
  
  // 收起按钮
  document.getElementById('btn-collapse').addEventListener('click', showFabMode);
  
  // 设置按钮
  document.getElementById('btn-settings').addEventListener('click', showSettingsMode);
  document.getElementById('btn-back').addEventListener('click', showPanelMode);
  
  // 笔记列表事件委托
  document.getElementById('notes-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.note-action-btn, .edit-btn');
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'delete') deleteNote(id);
      else if (action === 'edit') startEdit(id);
      else if (action === 'pin') togglePin(id);
      else if (action === 'sync') syncToSmartwork(id);
      else if (action === 'save-edit') saveEdit(id);
      else if (action === 'cancel-edit') cancelEdit(id);
      return;
    }
  });
  
  // 分类标签切换
  document.getElementById('category-tabs').addEventListener('click', (e) => {
    if (e.target.classList.contains('tab')) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      renderNotes(document.getElementById('search-input').value);
    }
  });
  
  // 搜索
  document.getElementById('search-input').addEventListener('input', (e) => renderNotes(e.target.value));
  
  // 保存按钮
  document.getElementById('btn-save').addEventListener('click', () => {
    const content = document.getElementById('note-input').value.trim();
    if (content) addNote(content, 'text');
  });
  
  // 回车保存
  document.getElementById('note-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = e.target.value.trim();
      if (content) addNote(content, 'text');
    }
  });
  
  // 粘贴图片
  document.getElementById('note-input').addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => addNote(event.target.result, 'image');
        reader.readAsDataURL(file);
        return;
      }
    }
  });
  
  // 语音输入
  [document.getElementById('btn-voice'), document.getElementById('btn-mic')].forEach(btn => {
    if (btn) btn.addEventListener('click', startVoiceInput);
  });
  [document.getElementById('btn-clipboard'), document.getElementById('btn-clip')].forEach(btn => {
    if (btn) btn.addEventListener('click', readClipboard);
  });
  [document.getElementById('btn-paste'), document.getElementById('btn-img')].forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      document.getElementById('note-input').focus();
      showToast('请按 Cmd+V 粘贴截图');
    });
  });
  
  // 设置面板事件
  document.getElementById('btn-add-category').addEventListener('click', addCategory);
  document.getElementById('btn-save-cat').addEventListener('click', saveCategory);
  document.getElementById('btn-cancel-cat').addEventListener('click', () => {
    editingCategoryId = null;
    renderCategorySettings();
  });
  
  // 分类列表事件委托
  document.getElementById('category-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-action-btn');
    if (btn) {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'edit-cat') {
        editingCategoryId = id;
        renderCategorySettings();
      } else if (action === 'delete-cat') {
        deleteCategory(id);
      }
    }
  });
  
  // 图标选择
  document.getElementById('cat-icon-select').addEventListener('click', (e) => {
    if (e.target.classList.contains('icon-option')) {
      document.querySelectorAll('#cat-icon-select .icon-option').forEach(el => el.classList.remove('selected'));
      e.target.classList.add('selected');
    }
  });
  
  // 颜色选择
  document.getElementById('cat-color-select').addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
      document.querySelectorAll('#cat-color-select .color-option').forEach(el => el.classList.remove('selected'));
      e.target.classList.add('selected');
    }
  });

  // AI 设置面板
  document.getElementById('btn-ai-settings')?.addEventListener('click', showAISettingsMode);
  document.getElementById('btn-ai-back')?.addEventListener('click', showSettingsMode);
  document.getElementById('btn-save-ai')?.addEventListener('click', saveAIConfig);
  document.getElementById('btn-test-ai')?.addEventListener('click', testAIConnection);
  
  // AI 启用开关
  const aiEnabledCheckbox = document.getElementById('ai-enabled');
  if (aiEnabledCheckbox) {
    aiEnabledCheckbox.addEventListener('change', (e) => {
      const configFields = document.getElementById('ai-config-fields');
      if (configFields) {
        configFields.style.opacity = e.target.checked ? '1' : '0.5';
        configFields.style.pointerEvents = e.target.checked ? 'auto' : 'none';
      }
    });
  }
}

function startVoiceInput() {
  if (!('webkitSpeechRecognition' in window)) { showToast('浏览器不支持语音识别'); return; }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'zh-CN'; recognition.continuous = false; recognition.interimResults = false;
  recognition.onstart = () => showToast('🎤 正在听...');
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    const textarea = document.getElementById('note-input');
    textarea.value += (textarea.value ? '\n' : '') + text;
  };
  recognition.onerror = () => showToast('语音识别失败');
  recognition.start();
}

function readClipboard() {
  try {
    const image = clipboard.readImage();
    if (!image.isEmpty()) { addNote(image.toDataURL(), 'image'); return; }
    const text = clipboard.readText();
    if (text) addNote(text, 'text');
    else showToast('剪贴板为空');
  } catch (e) { showToast('无法读取剪贴板'); }
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

ipcRenderer.on('window-blur', () => { if (isExpanded && !document.getElementById('settings-panel').classList.contains('expanded')) showFabMode(); });

init();

// ========== AI 设置相关函数 ==========

// 显示 AI 设置面板
async function showAISettingsMode() {
  document.getElementById('fab-container').style.display = 'none';
  document.getElementById('app').classList.remove('expanded');
  document.getElementById('settings-panel').classList.remove('expanded');
  document.getElementById('ai-settings-panel').style.display = 'block';
  ipcRenderer.send('resize-window', { width: 380, height: 560 });
  
  // 加载配置
  await loadAIConfig();
}

// 加载 AI 配置
async function loadAIConfig() {
  try {
    const config = await ipcRenderer.invoke('read-ai-config');
    document.getElementById('ai-enabled').checked = config.enabled || false;
    document.getElementById('ai-host').value = config.host || '127.0.0.1';
    document.getElementById('ai-port').value = config.port || '9999';
    document.getElementById('ai-apikey').value = config.apiKey || '';
    document.getElementById('ai-model').value = config.model || 'glm-5-external';
    
    // 更新字段可用状态
    const configFields = document.getElementById('ai-config-fields');
    if (configFields) {
      configFields.style.opacity = config.enabled ? '1' : '0.5';
      configFields.style.pointerEvents = config.enabled ? 'auto' : 'none';
    }
  } catch (e) {
    console.error('加载 AI 配置失败:', e);
  }
}

// 保存 AI 配置
async function saveAIConfig() {
  const config = {
    enabled: document.getElementById('ai-enabled').checked,
    host: document.getElementById('ai-host').value.trim() || '127.0.0.1',
    port: parseInt(document.getElementById('ai-port').value) || 9999,
    apiKey: document.getElementById('ai-apikey').value.trim(),
    model: document.getElementById('ai-model').value.trim() || 'glm-5-external'
  };
  
  try {
    await ipcRenderer.invoke('save-ai-config', config);
    showToast(config.enabled ? '✅ AI 分类已启用' : '✅ AI 分类已禁用（使用本地分类）');
    showSettingsMode();
  } catch (e) {
    showToast('❌ 保存失败');
  }
}

// 测试 AI 连接
async function testAIConnection() {
  const statusEl = document.getElementById('ai-status');
  statusEl.textContent = '测试中...';
  statusEl.style.color = '#666';
  
  try {
    const result = await ipcRenderer.invoke('classify-with-ai', '这是一个测试');
    if (result.success) {
      statusEl.textContent = '✅ 连接成功！分类结果: ' + result.category;
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = '❌ 连接失败: ' + result.error;
      statusEl.style.color = '#EF4444';
    }
  } catch (e) {
    statusEl.textContent = '❌ 测试失败: ' + e.message;
    statusEl.style.color = '#EF4444';
  }
}
