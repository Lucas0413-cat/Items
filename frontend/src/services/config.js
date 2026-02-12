import axios from 'axios';

// 检查是否在Electron环境中 - 更可靠的检测方法
const isElectron = () => {
  try {
    // 方法1: 检查是否存在electronAPI（通过contextBridge暴露）
    if (typeof window !== 'undefined' && window.electronAPI !== undefined) {
      console.log('检测到Electron环境（通过electronAPI）');
      return true;
    }
    // 方法2: 检查用户代理
    if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf('electron') >= 0) {
      console.log('检测到Electron环境（通过用户代理）');
      return true;
    }
    // 方法3: 检查是否存在Electron特有的对象
    if (typeof window !== 'undefined' && window.process && window.process.versions && window.process.versions.electron) {
      console.log('检测到Electron环境（通过process.versions.electron）');
      return true;
    }
  } catch (error) {
    console.log('检测Electron环境时出错:', error.message);
  }
  console.log('未检测到Electron环境，使用浏览器模式');
  return false;
};

// 检测后端是否可用
const checkBackendAvailability = async (baseURL) => {
  try {
    // 调试日志
    console.log('开始检查后端可用性...');
    
    // 检测是否为Electron环境
    const electronEnv = isElectron();
    
    // 在Electron环境中，使用完整URL进行健康检查
    if (electronEnv) {
      console.log('Electron环境，使用完整URL进行健康检查');
      // baseURL现在不包含/api，所以需要拼接/api/health
      const healthURL = `${baseURL.replace(/\/$/, '')}/api/health`;
      
      console.log('检查后端可用性，URL:', healthURL);
      const response = await axios.get(healthURL, { timeout: 60000 }); // 增加到60秒
      console.log('后端可用性检查成功，状态码:', response.status);
      console.log('后端响应数据:', response.data);
      
      // 只要请求成功，就认为后端可用
      return true;
    }
    
    // 浏览器环境（开发模式），使用相对路径，让Vite代理处理
    console.log('浏览器环境（开发模式），使用相对路径进行健康检查');
    // 直接使用相对路径，不设置baseURL
    const response = await axios.get('/api/health', {
      timeout: 60000, // 增加到60秒
      // 不设置baseURL，使用相对路径
    });
    console.log('后端可用性检查成功，状态码:', response.status);
    console.log('后端响应数据:', response.data);
    
  } catch (error) {
    console.error('后端可用性检查失败:', error.message);
    if (error.response) {
      console.error('响应错误状态码:', error.response.status);
      console.error('响应错误数据:', error.response.data);
      // 只要有响应，就认为后端可用（即使是错误响应）
      return true;
    } else if (error.request) {
      console.error('请求错误（网络问题或超时）:', error.request);
      // 对于超时错误，我们仍然返回true，因为后端可能只是响应慢
      // 特别是AI生成题目可能需要很长时间
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log('健康检查超时，但后端可能仍在运行（AI生成需要时间）');
        return true; // 仍然认为后端可用
      }
    } else {
      console.error('未知错误:', error.message);
    }
    // 只有真正的网络错误才返回false
    return false;
  }
};

// 创建模拟的axios实例（离线模式）
const createMockApiInstance = (baseURL) => {
  console.log('创建模拟API实例（离线模式），baseURL:', baseURL);
  
  // 创建模拟的axios实例
  const mockInstance = axios.create({
    baseURL,
    timeout: 30000, // 增加到30秒，避免在真实后端响应慢时过早切换到离线模式
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // 拦截所有请求并返回模拟数据
  mockInstance.interceptors.request.use((config) => {
    console.log('模拟API请求:', config.method, config.url);
    return config;
  });
  
  mockInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      // 对于模拟实例，我们总是返回成功的模拟响应
      console.log('模拟API响应，返回模拟数据');
      
      // 根据请求URL返回不同的模拟数据
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      
      if (url.includes('/health')) {
        return Promise.resolve({
          data: { status: 'healthy', message: '离线模式 - 模拟后端' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
      
      if (url.includes('/sections')) {
        return Promise.resolve({
          data: ['reading', 'listening', 'writing'],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
      
      if (url.includes('/difficulties')) {
        return Promise.resolve({
          data: ['easy', 'medium', 'hard'],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
      
      if (url.includes('/generate-questions') && method === 'post') {
        // 返回模拟的题目数据
        const requestData = error.config?.data ? JSON.parse(error.config.data) : {};
        const section = requestData.section || 'reading';
        const difficulty = requestData.difficulty || 'medium';
        const keyword = requestData.keyword || 'globalization';
        
        const mockQuestions = generateMockQuestions(section, difficulty, keyword);
        return Promise.resolve({
          data: mockQuestions,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
      
      // 默认返回成功但空的数据
      return Promise.resolve({
        data: { message: '离线模式 - 模拟响应' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config
      });
    }
  );
  
  return mockInstance;
};

// 生成模拟题目数据
const generateMockQuestions = (section, difficulty, keyword) => {
  const timestamp = new Date().toISOString();
  
  if (section === 'reading') {
    const passages = [
      {
        id: 1,
        title: `关于${keyword}的阅读文章`,
        content: `这是关于${keyword}的模拟阅读文章（${difficulty}难度）。在离线模式下，我们无法生成真实的AI内容，但您可以测试界面功能。\n\n全球化是一个复杂的社会现象，涉及经济、文化、政治等多个层面。随着技术的进步和交通的便利，世界各国之间的联系日益紧密。`,
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: `根据文章，${keyword}主要涉及哪些方面？`,
            options: ['仅经济方面', '经济、文化、政治等多个层面', '仅文化方面', '仅政治方面'],
            answer: '经济、文化、政治等多个层面'
          },
          {
            id: 2,
            type: 'true_false_not_given',
            question: `文章提到${keyword}只与经济有关。`,
            answer: 'False'
          },
          {
            id: 3,
            type: 'fill_blank',
            question: `随着技术的进步和交通的便利，世界各国之间的______日益紧密。`,
            answer: '联系'
          }
        ]
      }
    ];
    
    return {
      section: 'reading',
      difficulty: difficulty,
      data: {
        passages: passages
      }
    };
  }
  
  if (section === 'listening') {
    const sections = [
      {
        id: 1,
        title: `关于${keyword}的听力对话`,
        audio_url: null,
        transcript: `这是关于${keyword}的模拟听力文本（${difficulty}难度）。在离线模式下，我们无法提供真实的音频内容。`,
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: `听力材料主要讨论什么主题？`,
            options: ['技术发展', keyword, '政治改革', '文化差异'],
            answer: keyword
          }
        ]
      }
    ];
    
    return {
      section: 'listening',
      difficulty: difficulty,
      data: {
        sections: sections
      }
    };
  }
  
  if (section === 'writing') {
    const tasks = [
      {
        id: 1,
        type: '图表描述',
        description: `请描述以下关于${keyword}的图表（模拟数据）。`,
        data: `图表显示${keyword}在过去十年中的增长趋势。`
      },
      {
        id: 2,
        type: '议论文',
        topic: `讨论${keyword}对现代社会的影响。`,
        requirements: '请写出至少250字的文章，讨论正反两方面观点。'
      }
    ];
    
    return {
      section: 'writing',
      difficulty: difficulty,
      data: {
        tasks: tasks
      }
    };
  }
  
  return {
    section: section,
    difficulty: difficulty,
    data: {}
  };
};

// 读取.env文件配置
async function loadConfig() {
  // 检测是否在浏览器环境中（包括Electron）
  const hasWindow = typeof window !== 'undefined';
  const hasLocation = hasWindow && window.location;
  const isHttpProtocol = hasLocation && window.location.protocol.startsWith('http');
  
  console.log('当前环境检测:');
  console.log('  - hasWindow:', hasWindow);
  console.log('  - hasLocation:', hasLocation);
  if (hasLocation) {
    console.log('  - protocol:', window.location.protocol);
    console.log('  - host:', window.location.host);
  }
  console.log('  - isHttpProtocol:', isHttpProtocol);
  
  // 检测是否在Electron环境中
  const electronEnv = isElectron();
  console.log('  - isElectron:', electronEnv);
  
  // 根据环境决定默认API_BASE_URL
  // 统一规范：baseURL不包含/api前缀，所有API请求路径都以/api开头
  let defaultApiBaseUrl;
  if (electronEnv) {
    // Electron环境：总是使用完整URL（不带/api）
    defaultApiBaseUrl = 'http://localhost:5000';
    console.log('Electron环境，使用完整URL（不带/api）:', defaultApiBaseUrl);
  } else if (isHttpProtocol) {
    // 浏览器开发环境：使用根路径，让Vite代理处理
    defaultApiBaseUrl = '/';
    console.log('浏览器开发环境，使用根路径:', defaultApiBaseUrl);
  } else {
    // 其他环境（如Node.js测试）：使用完整URL（不带/api）
    defaultApiBaseUrl = 'http://localhost:5000';
    console.log('其他环境，使用完整URL（不带/api）:', defaultApiBaseUrl);
  }
  
  // 默认配置
  const defaultConfig = {
    QWEN_API_KEY: import.meta.env.VITE_QWEN_API_KEY || 'sk-111a65256bec4ad6956fa4de616a34fa',
    QWEN_API_URL: import.meta.env.VITE_QWEN_API_URL || 'https://api.example.com/qwen-max',
    // 使用环境变量或根据环境决定的默认值
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
  };
  console.log('最终API_BASE_URL:', defaultConfig.API_BASE_URL);
  
  // 在Electron环境中尝试读取.env文件
  if (electronEnv && window.electronAPI) {
    try {
      const result = await window.electronAPI.readEnv('../backend/.env');
      if (result.success) {
        const config = { ...defaultConfig };
        result.content.split('\n').forEach(line => {
          const match = line.match(/^([^#=]+)=(.*)$/);
          if (match) {
            config[match[1].trim()] = match[2].trim();
          }
        });
        console.log('从.env文件读取配置:', config);
        return config;
      }
    } catch (error) {
      console.error('Error reading .env file:', error);
    }
  }
  
  console.log('返回默认配置:', defaultConfig);
  return defaultConfig;
}

// 创建axios实例
const createApiInstance = async () => {
  console.log('=== 开始创建API实例 ===');
  const config = await loadConfig();
  const baseURL = config.API_BASE_URL;
  
  // 详细调试日志
  console.log('创建API实例详细信息:');
  console.log('  - baseURL:', baseURL);
  console.log('  - 当前环境:', isElectron() ? 'Electron' : '浏览器');
  console.log('  - 完整配置:', JSON.stringify(config, null, 2));
  
  // 检查后端是否可用
  console.log('开始检查后端可用性...');
  const backendAvailable = await checkBackendAvailability(baseURL);
  
  if (!backendAvailable) {
    console.log('❌ 后端不可用，切换到离线模式');
    console.log('原因: 健康检查失败或超时');
    console.log('将创建模拟API实例返回离线数据');
    return createMockApiInstance(baseURL);
  }
  
  console.log('✅ 后端可用，创建真实API实例');
  
  // 检测是否为Electron环境
  const electronEnv = isElectron();
  
  // 在Electron环境中，总是使用完整URL
  // 因为file://协议下的相对路径会被错误解析
  if (electronEnv) {
    console.log('Electron环境，使用完整URL API实例:', baseURL);
    console.log('超时设置: 180秒 (180000毫秒)，与AI生成时间匹配');
    return axios.create({
      baseURL,
      timeout: 180000, // 增加到180秒，与AI生成时间（Dify工作流）匹配
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 浏览器环境（开发模式），使用相对路径，让Vite代理处理
  console.log('浏览器环境（开发模式），使用相对路径API实例');
  console.log('超时设置: 180秒 (180000毫秒)，与AI生成时间匹配');
  return axios.create({
    // 不设置baseURL，使用相对路径
    timeout: 180000, // 增加到180秒，与AI生成时间（Dify工作流）匹配
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export { loadConfig, createApiInstance, checkBackendAvailability };