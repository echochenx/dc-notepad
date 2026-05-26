// Smartwork API 集成模块 - D-Chat OpenAPI
const { ipcRenderer } = require('electron');

class SmartworkAPI {
  constructor() {
    this.baseURL = 'http://10.88.128.40:8000/dichat/snitch_openapi_online_lb';
    this.clientId = '';
    this.clientSecret = '';
    this.botType = 'official_account';
    this.botName = '';
    this.loadConfig();
  }

  async loadConfig() {
    const config = await ipcRenderer.invoke('read-smartwork-config');
    if (config) {
      this.clientId = config.clientId || '';
      this.clientSecret = config.clientSecret || '';
      this.botType = config.botType || 'official_account';
      this.botName = config.botName || '';
    }
  }

  async saveConfig(config) {
    this.clientId = config.clientId || this.clientId;
    this.clientSecret = config.clientSecret || this.clientSecret;
    this.botType = config.botType || this.botType;
    this.botName = config.botName || this.botName;
    await ipcRenderer.invoke('save-smartwork-config', {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      botType: this.botType,
      botName: this.botName
    });
  }

  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.botName);
  }

  // 通用请求方法 - D-Chat OpenAPI 鉴权
  async request(endpoint, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Smartwork 未配置，请先在设置中填写应用凭证和服务号');
    }

    const url = `${this.baseURL}${endpoint}`;
    
    // D-Chat OpenAPI 使用 HTTP Basic Auth
    const headers = {
      'Content-Type': 'application/json;charset=utf-8',
      'X-Bot-Type': this.botType,
      ...options.headers
    };

    // 服务号鉴权需要 X-Bot-Name 或 X-Bot-Id
    if (this.botName) {
      headers['X-Bot-Name'] = this.botName;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      // HTTP Basic Auth: client_id as user, client_secret as password
      // 在 Electron 中需要手动设置 Authorization header
    });

    // 由于 fetch 不直接支持 Basic Auth，需要手动编码
    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;

    const response2 = await fetch(url, {
      ...options,
      headers
    });

    if (!response2.ok) {
      const errorText = await response2.text();
      throw new Error(`API 错误 (${response2.status}): ${errorText}`);
    }

    return response2.json();
  }

  // 创建待办
  async createTodo({ title, content, dueDate, assignee }) {
    const body = {
      title: title,
      content: content || '',
    };

    if (dueDate) {
      body.due_date = dueDate;
    }

    if (assignee) {
      body.assignee = assignee;
    }

    return this.request('/v1/todo.create', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // 获取待办列表
  async getTodos({ status = 'pending', limit = 50 } = {}) {
    return this.request(`/v1/todo.list?status=${status}&limit=${limit}`);
  }

  // 完成待办
  async completeTodo(todoId) {
    return this.request('/v1/todo.complete', {
      method: 'POST',
      body: JSON.stringify({ todo_id: todoId })
    });
  }
}

const smartwork = new SmartworkAPI();
module.exports = { smartwork };
