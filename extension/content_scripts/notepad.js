// DC 悬浮记事本 - Content Script
(function() {
  'use strict';
  
  // 防止重复注入
  if (window.dcNotepadInjected) return;
  window.dcNotepadInjected = true;

  // 分类配置
  const CATEGORIES = {
    todo: { name: '待办', icon: '✅', color: '#10B981' },
    info: { name: '临时信息', icon: '🔑', color: '#F59E0B' },
    meeting: { name: '会议', icon: '📋', color: '#3B82F6' },
    idea: { name: '灵感', icon: '💡', color: '#8B5CF6' },
    question: { name: '疑问', icon: '❓', color: '#F97316' },
    other: { name: '其他', icon: '📌', color: '#9CA3AF' }
  };

  // 本地规则引擎（备用）
  const LOCAL_RULES = {
    todo: /要做|完成|跟进|提醒|记得|待办|TODO|todo/i,
    info: /key|token|密码|账号|api[_-]?key|secret|pwd|passwd/i,
    meeting: /会议|讨论|对齐|评审|周会|站会|sync|meeting/i,
    idea: /想法|试试|能不能|如果|也许|可以考虑|灵感|思路/i,
    question: /为什么|怎么|如何|\?|？|不懂|疑问|问一下/i
  };

  let isVisible = false;
  let currentCategory = 'all';
  let notes = [];

  // 初始化
  function init() {
    createUI();
    loadNotes();
    setupEventListeners();
    
    // 监听快捷键消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggle') {
        togglePanel();
        sendResponse({ success: true });
      }
    });
  }

  // 创建 UI
  function createUI() {
    const container = document.createElement('div');
    container.id = 'dc-notepad-container';
    
    container.innerHTML = `
      <button id="dc-notepad-fab" title="Alt+N 快捷键">📝</button>
      <div id="dc-notepad-panel" class="hidden">
        <div id="dc-notepad-header">
          <div id="dc-notepad-title">
            <span>📝</span>
            <span>DC 悬浮记事本</span>
          </div>
          <div id="dc-notepad-controls">
            <button id="dc-notepad-minimize" title="最小化">─</button>
            <button id="dc-notepad-close" title="关闭">×</button>
          </div>
        </div>
        
        <div id="dc-notepad-search">
          <input type="text" id="dc-notepad-search-input" placeholder="搜索笔记...">
          <div id="dc-notepad-search-actions">
            <button id="dc-notepad-voice" title="语音输入">🎤</button>
            <button id="dc-notepad-paste" title="粘贴截图">📷</button>
            <button id="dc-notepad-clipboard" title="读取剪贴板">📋</button>
          </div>
        </div>
        
        <div id="dc-notepad-tabs">
          <button class="dc-notepad-tab active" data-category="all">📁 全部</button>
          <button class="dc-notepad-tab todo" data-category="todo">✅ 待办</button>
          <button class="dc-notepad-tab info" data-category="info">🔑 信息</button>
          <button class="dc-notepad-tab meeting" data-category="meeting">📋 会议</button>
          <button class="dc-notepad-tab idea" data-category="idea">💡 灵感</button>
          <button class="dc-notepad-tab question" data-category="question">❓ 疑问</button>
          <button class="dc-notepad-tab other" data-category="other">📌 其他</button>
        </div>
        
        <div id="dc-notepad-list"></div>
        
        <div id="dc-notepad-input-area">
          <textarea id="dc-notepad-textarea" placeholder="输入文字、粘贴截图...\n支持 Markdown"></textarea>
          <div id="dc-notepad-input-actions">
            <div id="dc-notepad-input-left">
              <button id="btn-paste-image" title="粘贴图片">📷</button>
              <button id="btn-voice" title="语音">🎤</button>
              <button id="btn-clipboard" title="剪贴板">📋</button>
            </div>
            <button id="dc-notepad-save-btn">保存 (Enter)</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
  }

  // 加载笔记
  async function loadNotes() {
    const result = await chrome.storage.local.get(['dcNotepadNotes']);
    notes = result.dcNotepadNotes || [];
    renderNotes();
  }

  // 保存笔记
  async function saveNotes() {
    await chrome.storage.local.set({ dcNotepadNotes: notes });
  }

  // 渲染笔记列表
  function renderNotes(searchTerm = '') {
    const listEl = document.getElementById('dc-notepad-list');
    let filtered = notes;
    
    // 分类筛选
    if (currentCategory !== 'all') {
      filtered = filtered.filter(n => n.type === currentCategory);
    }
    
    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.content.toLowerCase().includes(term) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(term)))
      );
    }
    
    // 置顶优先，时间倒序
    filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#94a3b8">
          <div style="font-size:40px;margin-bottom:12px">📝</div>
          <div style="font-size:13px">暂无笔记</div>
          <div style="font-size:12px;margin-top:8px">按 Alt+N 快速记录</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(note => {
      const cat = CATEGORIES[note.type] || CATEGORIES.other;
      const time = formatTime(note.createdAt);
      const pinnedBadge = note.pinned ? '<span style="color:#f59e0b;margin-right:4px">📌</span>' : '';
      
      let contentHtml = '';
      if (note.contentType === 'image') {
        contentHtml = `<img src="${note.content}" class="dc-notepad-item-image">`;
      } else {
        contentHtml = `<div class="dc-notepad-item-content">${escapeHtml(note.content)}</div>`;
      }
      
      return `
        <div class="dc-notepad-item dc-notepad-item-${note.type} ${note.pinned ? 'pinned' : ''}" data-id="${note.id}">
          <div class="dc-notepad-item-header">
            <span class="dc-notepad-item-type ${note.type}">${cat.icon} ${cat.name}</span>
            <span class="dc-notepad-item-time">${time}</span>
          </div>
          ${pinnedBadge}${contentHtml}
        </div>
      `;
    }).join('');
  }

  // 添加笔记
  async function addNote(content, contentType = 'text') {
    // 调用 LLM 分类
    const type = await classifyWithLLM(content, contentType);
    
    const note = {
      id: generateId(),
      type,
      content,
      contentType,
      tags: extractTags(content),
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    notes.unshift(note);
    await saveNotes();
    renderNotes();
    
    // 显示保存提示
    const cat = CATEGORIES[type];
    showToast(`已保存到 ${cat.icon}${cat.name}`);
    
    // 清空输入
    document.getElementById('dc-notepad-textarea').value = '';
  }

  // LLM 分类
  async function classifyWithLLM(content, contentType) {
    try {
      // 发送给 background script 调用 LLM
      const response = await chrome.runtime.sendMessage({
        action: 'classify',
        content: content.slice(0, 500), // 限制长度
        contentType
      });
      
      if (response && response.category && CATEGORIES[response.category]) {
        return response.category;
      }
    } catch (e) {
      console.log('LLM 分类失败，使用本地规则:', e);
    }
    
    // 降级到本地规则
    return classifyWithLocalRules(content);
  }

  // 本地规则分类
  function classifyWithLocalRules(content) {
    const text = content.toLowerCase();
    for (const [type, regex] of Object.entries(LOCAL_RULES)) {
      if (regex.test(text)) return type;
    }
    return 'other';
  }

  // 提取标签
  function extractTags(content) {
    const tags = [];
    const matches = content.match(/#[\w\u4e00-\u9fa5]+/g);
    if (matches) {
      tags.push(...matches);
    }
    return tags;
  }

  // 设置事件监听
  function setupEventListeners() {
    // FAB 点击
    document.getElementById('dc-notepad-fab').addEventListener('click', togglePanel);
    
    // 关闭/最小化
    document.getElementById('dc-notepad-close').addEventListener('click', hidePanel);
    document.getElementById('dc-notepad-minimize').addEventListener('click', hidePanel);
    
    // 分类标签切换
    document.getElementById('dc-notepad-tabs').addEventListener('click', (e) => {
      if (e.target.classList.contains('dc-notepad-tab')) {
        document.querySelectorAll('.dc-notepad-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderNotes(document.getElementById('dc-notepad-search-input').value);
      }
    });
    
    // 搜索
    document.getElementById('dc-notepad-search-input').addEventListener('input', (e) => {
      renderNotes(e.target.value);
    });
    
    // 保存按钮
    document.getElementById('dc-notepad-save-btn').addEventListener('click', () => {
      const content = document.getElementById('dc-notepad-textarea').value.trim();
      if (content) {
        addNote(content, 'text');
      }
    });
    
    // 回车保存
    document.getElementById('dc-notepad-textarea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = e.target.value.trim();
        if (content) {
          addNote(content, 'text');
        }
      }
    });
    
    // 粘贴图片
    document.getElementById('dc-notepad-textarea').addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            addNote(event.target.result, 'image');
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    });
    
    // 工具按钮
    document.getElementById('dc-notepad-voice').addEventListener('click', startVoiceInput);
    document.getElementById('btn-voice').addEventListener('click', startVoiceInput);
    
    document.getElementById('dc-notepad-clipboard').addEventListener('click', readClipboard);
    document.getElementById('btn-clipboard').addEventListener('click', readClipboard);
    
    document.getElementById('dc-notepad-paste').addEventListener('click', () => {
      document.getElementById('dc-notepad-textarea').focus();
      showToast('请按 Ctrl+V 粘贴截图');
    });
    document.getElementById('btn-paste-image').addEventListener('click', () => {
      document.getElementById('dc-notepad-textarea').focus();
      showToast('请按 Ctrl+V 粘贴截图');
    });
    
    // 拖拽功能
    setupDraggable();
  }

  // 语音输入
  function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
      showToast('浏览器不支持语音识别');
      return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      showToast('🎤 正在听...');
    };
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      const textarea = document.getElementById('dc-notepad-textarea');
      textarea.value += (textarea.value ? '\n' : '') + text;
    };
    
    recognition.onerror = () => {
      showToast('语音识别失败');
    };
    
    recognition.start();
  }

  // 读取剪贴板
  async function readClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        addNote(text, 'text');
      } else {
        showToast('剪贴板为空');
      }
    } catch (e) {
      showToast('无法读取剪贴板，请手动粘贴');
    }
  }

  // 切换面板显示
  function togglePanel() {
    const panel = document.getElementById('dc-notepad-panel');
    const fab = document.getElementById('dc-notepad-fab');
    
    if (isVisible) {
      hidePanel();
    } else {
      panel.classList.remove('hidden');
      fab.style.display = 'none';
      isVisible = true;
      document.getElementById('dc-notepad-textarea').focus();
      renderNotes();
    }
  }

  // 隐藏面板
  function hidePanel() {
    const panel = document.getElementById('dc-notepad-panel');
    const fab = document.getElementById('dc-notepad-fab');
    
    panel.classList.add('hidden');
    fab.style.display = 'flex';
    isVisible = false;
  }

  // 拖拽功能
  function setupDraggable() {
    const header = document.getElementById('dc-notepad-header');
    const panel = document.getElementById('dc-notepad-panel');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.position = 'fixed';
      panel.style.left = startLeft + 'px';
      panel.style.top = startTop + 'px';
      panel.style.transform = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = (startLeft + dx) + 'px';
      panel.style.top = (startTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // 显示 Toast
  function showToast(message) {
    const existing = document.getElementById('dc-notepad-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.id = 'dc-notepad-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 2000);
  }

  // 工具函数
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

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
