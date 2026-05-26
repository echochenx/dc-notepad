// DC 悬浮记事本 - Background Service Worker

// 分类提示词模板
const CLASSIFY_PROMPT = `你是一个智能分类助手。请根据用户输入的内容，判断它属于以下哪一类：

【分类说明】
- todo: 待办事项，包含"要做、完成、跟进、提醒、记得、待办"等关键词
- info: 临时信息，如 API Key、密码、token、账号等敏感信息
- meeting: 会议相关内容，包含"会议、讨论、对齐、评审、周会"等
- idea: 灵感想法，包含"想法、试试、能不能、如果、考虑"等
- question: 疑问，包含"为什么、怎么、如何、不懂、疑问"等
- other: 其他无法归类的内容

【输出要求】
只输出分类名称（小写），不要解释。例如：todo

用户输入："{content}"

分类结果：`;

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('DC 悬浮记事本已安装');
});

// 监听快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-notepad') {
    // 向当前活动标签页发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }).catch(() => {
          // 如果 content script 未加载，忽略错误
        });
      }
    });
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'classify') {
    classifyContent(request.content, request.contentType)
      .then(category => {
        sendResponse({ category });
      })
      .catch(error => {
        console.error('分类失败:', error);
        // 降级到本地规则
        const category = classifyWithLocalRules(request.content);
        sendResponse({ category, error: error.message });
      });
    return true; // 保持消息通道开放
  }
});

// 调用 LiteLLM 进行分类
async function classifyContent(content, contentType) {
  // 如果是图片，直接使用 meeting 分类
  if (contentType === 'image') {
    return 'meeting';
  }
  
  // 准备提示词
  const prompt = CLASSIFY_PROMPT.replace('{content}', content.slice(0, 500));
  
  try {
    // 调用 LiteLLM
    // 注意：这里需要根据实际的 LiteLLM 部署地址修改
    const response = await fetch('http://127.0.0.1:9999/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-_CtcSvsxMWwTkoeFVTSmfw'  // 根据实际配置修改
      },
      body: JSON.stringify({
        model: 'glm-5-external',  // 或你绑定的其他模型
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'other';
    
    // 验证返回的分类是否有效
    const validCategories = ['todo', 'info', 'meeting', 'idea', 'question', 'other'];
    if (validCategories.includes(result)) {
      return result;
    }
    
    // 如果返回无效，尝试从返回内容中提取
    for (const cat of validCategories) {
      if (result.includes(cat)) {
        return cat;
      }
    }
    
    return 'other';
  } catch (error) {
    console.error('LLM 调用失败:', error);
    throw error;
  }
}

// 本地规则分类（降级方案）
function classifyWithLocalRules(content) {
  const text = content.toLowerCase();
  
  const rules = {
    todo: /要做|完成|跟进|提醒|记得|待办|todo/i,
    info: /key|token|密码|账号|api[_-]?key|secret|pwd/i,
    meeting: /会议|讨论|对齐|评审|周会|站会|meeting/i,
    idea: /想法|试试|能不能|如果|也许|考虑|灵感/i,
    question: /为什么|怎么|如何|\?|？|不懂|疑问/i
  };
  
  for (const [type, regex] of Object.entries(rules)) {
    if (regex.test(text)) return type;
  }
  
  return 'other';
}

// 定期清理过期笔记（阅后即焚）
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-expired') {
    cleanupExpiredNotes();
  }
});

// 启动时设置定时器
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('cleanup-expired', { periodInMinutes: 60 });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('cleanup-expired', { periodInMinutes: 60 });
});

// 清理过期笔记
async function cleanupExpiredNotes() {
  const result = await chrome.storage.local.get(['dcNotepadNotes']);
  const notes = result.dcNotepadNotes || [];
  
  const now = new Date().toISOString();
  const validNotes = notes.filter(note => {
    if (!note.expireAt) return true;
    return note.expireAt > now;
  });
  
  if (validNotes.length !== notes.length) {
    await chrome.storage.local.set({ dcNotepadNotes: validNotes });
    console.log(`清理了 ${notes.length - validNotes.length} 条过期笔记`);
  }
}
