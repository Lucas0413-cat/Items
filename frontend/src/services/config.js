import axios from 'axios';

// 检查是否在Electron环境中 - 更可靠的检测方法
const isElectron = () => {
  // 方法1: 检查是否存在electronAPI（通过contextBridge暴露）
  if (window.electronAPI !== undefined) return true;
  // 方法2: 检查用户代理
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf('electron') >= 0) return true;
  // 方法3: 检查是否存在Electron特有的对象
  if (typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron) return true;
  return false;
};

// 读取.env文件配置
async function loadConfig() {
  const electronEnv = isElectron();
  
  if (electronEnv && window.electronAPI) {
    try {
      const result = await window.electronAPI.readEnv('../backend/.env');
      if (result.success) {
        const config = {};
        result.content.split('\n').forEach(line => {
          const match = line.match(/^([^#=]+)=(.*)$/);
          if (match) {
            config[match[1].trim()] = match[2].trim();
          }
        });
        return config;
      }
    } catch (error) {
      console.error('Error reading .env file:', error);
    }
  }
  
  // 默认配置
  return {
    QWEN_API_KEY: import.meta.env.VITE_QWEN_API_KEY || 'sk-111a65256bec4ad6956fa4de616a34fa',
    QWEN_API_URL: import.meta.env.VITE_QWEN_API_URL || 'https://api.example.com/qwen-max',
    // 在Electron中总是使用完整URL，在浏览器中使用代理路径
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || (electronEnv ? 'http://localhost:5000/api' : '/api')
  };
}

// 创建axios实例
const createApiInstance = async () => {
  const config = await loadConfig();
  
  // 调试日志
  console.log('创建API实例，baseURL:', config.API_BASE_URL);
  console.log('当前环境:', isElectron() ? 'Electron' : '浏览器');
  
  return axios.create({
    baseURL: config.API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export { loadConfig, createApiInstance };