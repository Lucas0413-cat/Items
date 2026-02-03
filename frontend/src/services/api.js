import { createApiInstance } from './config';

let apiInstance = null;

// 初始化API实例
const initApi = async () => {
  if (!apiInstance) {
    apiInstance = await createApiInstance();
  }
  return apiInstance;
};

// API方法
export const generateQuestions = async (section, difficulty = 'medium', count = 1) => {
  const api = await initApi();
  try {
    const response = await api.post('/generate-questions', {
      section,
      difficulty,
      count
    });
    return response.data;
  } catch (error) {
    console.error('生成题目失败:', error);
    throw error;
  }
};

export const getSections = async () => {
  const api = await initApi();
  try {
    const response = await api.get('/sections');
    return response.data;
  } catch (error) {
    console.error('获取板块失败:', error);
    throw error;
  }
};

export const getDifficulties = async () => {
  const api = await initApi();
  try {
    const response = await api.get('/difficulties');
    return response.data;
  } catch (error) {
    console.error('获取难度级别失败:', error);
    throw error;
  }
};

export const healthCheck = async () => {
  const api = await initApi();
  try {
    console.log('正在检查API健康状态，URL:', api.defaults.baseURL + '/health');
    const response = await api.get('/health');
    console.log('API健康检查成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('健康检查失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误响应:', error.response?.data);
    console.error('错误状态:', error.response?.status);
    throw error;
  }
};

export default initApi;