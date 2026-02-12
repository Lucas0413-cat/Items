import { createApiInstance } from './config';

let apiInstance = null;
let apiInstanceTimestamp = null;
const API_INSTANCE_TTL = 30000; // API实例的有效期，30秒

// 初始化API实例
const initApi = async (forceRefresh = false) => {
  // 检查API实例是否过期或需要强制刷新
  const now = Date.now();
  if (!apiInstance || forceRefresh || !apiInstanceTimestamp || (now - apiInstanceTimestamp) > API_INSTANCE_TTL) {
    console.log('创建新的API实例');
    // 使用createApiInstance函数创建实例，它会根据环境自动处理URL
    apiInstance = await createApiInstance();
    apiInstanceTimestamp = now;
    console.log('已创建API实例，根据环境自动配置URL');
  }
  return apiInstance;
};

// API方法
export const generateQuestions = async (section, difficulty = 'medium', count = 1, keyword = null, useDify = false, topic = '', user = '', questionCount = 10, passageLength = 800) => {
  console.log('=== 开始生成题目 ===');
  console.log('请求参数:');
  console.log('  - section:', section);
  console.log('  - difficulty:', difficulty);
  console.log('  - count:', count);
  console.log('  - keyword:', keyword);
  console.log('  - useDify:', useDify);
  console.log('  - topic:', topic);
  console.log('  - user:', user);
  console.log('  - questionCount:', questionCount);
  console.log('  - passageLength:', passageLength);
  
  // 强制刷新API实例，确保尝试连接真实的后端服务
  console.log('初始化API实例...');
  const api = await initApi(true);
  console.log('API实例初始化完成');
  
  try {
    const requestData = {
      section,
      difficulty,
      count
    };
    
    // 如果有关键词，添加到请求数据中
    if (keyword && keyword.trim() !== '') {
      requestData.keyword = keyword.trim();
    }
    
    // 如果使用Dify工作流，添加相关参数
    if (useDify) {
      requestData.use_dify = true;
      if (topic && topic.trim() !== '') {
        requestData.topic = topic.trim();
      }
      // user参数已删除，不传递给后端
      if (questionCount && questionCount > 0) {
        requestData.question_count = parseInt(questionCount);
      }
      if (passageLength && passageLength > 0) {
        requestData.passage_length = parseInt(passageLength);
      }
    }
    
    console.log('发送请求到后端:');
    console.log('  - URL: /api/generate-questions');
    console.log('  - 请求数据:', JSON.stringify(requestData, null, 2));
    console.log('  - 超时: 120秒');
    
    const startTime = Date.now();
    const response = await api.post('/api/generate-questions', requestData);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 后端响应成功!`);
    console.log(`  - 响应时间: ${duration}毫秒 (${(duration/1000).toFixed(2)}秒)`);
    console.log(`  - 状态码: ${response.status}`);
    console.log(`  - 响应数据大小: ${JSON.stringify(response.data).length} 字符`);
    
    // 检查是否是模拟数据
    if (response.data.data && response.data.data.passages) {
      const firstPassage = response.data.data.passages[0];
      console.log(`  - 生成的文章标题: ${firstPassage.title}`);
      console.log(`  - 是否是AI生成: ${firstPassage.title.includes('离线') ? '❌ 可能是离线数据' : '✅ 可能是AI生成'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ 生成题目失败:', error.message);
    console.error('错误详情:', error);
    
    if (error.response) {
      console.error('响应错误:');
      console.error('  - 状态码:', error.response.status);
      console.error('  - 响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求错误 (无响应):');
      console.error('  - 请求对象:', error.request);
      console.error('  - 错误代码:', error.code);
    } else {
      console.error('配置错误:', error.message);
    }
    
    console.log('切换到离线模式，返回模拟数据...');
    // 在离线模式下，返回模拟数据而不是抛出错误
    const timestamp = new Date().toISOString();
    if (section === 'reading') {
      const passages = [
        {
          id: 1,
          title: `关于${keyword || '全球化'}的离线模式阅读文章`,
          content: `这是关于${keyword || '全球化'}的离线模式阅读文章。生成时间: ${timestamp}`,
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              question: '离线模式下，这是什么类型的题目？',
              options: ['阅读题', '听力题', '写作题', '口语题'],
              answer: '阅读题'
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
    // 对于其他情况，让错误继续抛出，config.js的模拟API应该已经处理了
    throw error;
  }
};

export const getSections = async () => {
  const api = await initApi();
  try {
    const response = await api.get('/api/sections');
    return response.data;
  } catch (error) {
    console.error('获取板块失败:', error);
    // 离线模式下返回默认板块
    return ['reading', 'listening', 'writing'];
  }
};

export const getDifficulties = async () => {
  const api = await initApi();
  try {
    const response = await api.get('/api/difficulties');
    return response.data;
  } catch (error) {
    console.error('获取难度级别失败:', error);
    // 离线模式下返回默认难度级别
    return ['easy', 'medium', 'hard'];
  }
};

export const healthCheck = async () => {
  // 使用API实例进行健康检查，确保URL拼接正确
  const api = await initApi(true); // 强制刷新实例
  try {
    console.log('正在检查API健康状态');
    const response = await api.get('/api/health');
    console.log('API健康检查成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('健康检查失败，使用离线模式:', error.message);
    // 不抛出错误，而是返回离线状态
    return {
      status: 'offline',
      message: '离线模式 - 后端不可用',
      timestamp: new Date().toISOString()
    };
  }
};

// 评估写作作文
export const evaluateWriting = async (requestData) => {
  const api = await initApi();
  try {
    const response = await api.post('/api/evaluate-writing', requestData);
    return response.data;
  } catch (error) {
    console.error('评估写作失败:', error);
    // 离线模式下返回模拟评估数据
    return {
      overall_score: 6.5,
      overall_feedback: '离线模式 - 模拟评估结果',
      word_count: requestData.user_essay.split(/\s+/).length,
      character_count: requestData.user_essay.length,
      is_mock_data: true,
      task_response: {
        score: 6.5,
        strengths: ['基本回应了题目要求', '观点表达基本清晰'],
        weaknesses: ['缺乏深度分析', '例子不够具体'],
        suggestions: ['提供更多具体例子', '加强论证逻辑']
      },
      coherence_cohesion: {
        score: 6.0,
        strengths: ['文章结构基本合理', '使用了连接词'],
        weaknesses: ['段落过渡不够自然', '逻辑连贯性有待提高'],
        suggestions: ['使用更多过渡词', '加强段落间的逻辑联系']
      },
      lexical_resource: {
        score: 6.5,
        strengths: ['词汇使用基本准确', '尝试使用了一些高级词汇'],
        weaknesses: ['词汇重复较多', '用词不够精确'],
        suggestions: ['扩大词汇量', '使用同义词替换']
      },
      grammatical_range_accuracy: {
        score: 6.0,
        strengths: ['基本语法正确', '尝试使用复杂句型'],
        weaknesses: ['存在语法错误', '句型结构单一'],
        suggestions: ['复习语法规则', '练习使用不同句型']
      }
    };
  }
};

export default initApi;