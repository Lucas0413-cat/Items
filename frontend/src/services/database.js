// 本地数据库服务 - 使用localStorage存储答题记录
const DB_PREFIX = 'ielts_practice_';

// 数据库键名
const KEYS = {
  QUESTIONS: DB_PREFIX + 'questions',
  ANSWERS: DB_PREFIX + 'answers',
  SESSIONS: DB_PREFIX + 'sessions'
};

// 初始化数据库
export const initDatabase = () => {
  // 确保所有键都存在
  if (!localStorage.getItem(KEYS.QUESTIONS)) {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.ANSWERS)) {
    localStorage.setItem(KEYS.ANSWERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SESSIONS)) {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
  }
  console.log('数据库初始化完成');
};

// 保存生成的题目
export const saveQuestion = (questionData) => {
  try {
    const questions = JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]');
    
    // 生成唯一ID
    const newQuestion = {
      id: Date.now(), // 使用时间戳作为ID
      ...questionData,
      created_at: new Date().toISOString()
    };
    
    questions.push(newQuestion);
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
    
    console.log('题目保存成功:', newQuestion.id);
    return newQuestion;
  } catch (error) {
    console.error('保存题目失败:', error);
    return null;
  }
};

// 保存答题记录
export const saveAnswer = (questionId, questionIndex, userAnswer, isCorrect) => {
  try {
    const answers = JSON.parse(localStorage.getItem(KEYS.ANSWERS) || '[]');
    
    const newAnswer = {
      id: Date.now(),
      question_id: questionId,
      question_index: questionIndex,
      user_answer: userAnswer,
      is_correct: isCorrect,
      answer_time: new Date().toISOString()
    };
    
    answers.push(newAnswer);
    localStorage.setItem(KEYS.ANSWERS, JSON.stringify(answers));
    
    console.log('答题记录保存成功:', newAnswer.id);
    return newAnswer;
  } catch (error) {
    console.error('保存答题记录失败:', error);
    return null;
  }
};

// 保存练习会话
export const saveSession = (keyword, difficulty, score) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
    
    const newSession = {
      id: Date.now(),
      keyword,
      difficulty,
      score,
      completed_at: new Date().toISOString()
    };
    
    sessions.push(newSession);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    
    console.log('练习会话保存成功:', newSession.id);
    return newSession;
  } catch (error) {
    console.error('保存练习会话失败:', error);
    return null;
  }
};

// 获取所有题目
export const getAllQuestions = () => {
  try {
    const questions = JSON.parse(localStorage.getItem(KEYS.QUESTIONS) || '[]');
    return questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('获取题目失败:', error);
    return [];
  }
};

// 获取所有答题记录
export const getAllAnswers = () => {
  try {
    const answers = JSON.parse(localStorage.getItem(KEYS.ANSWERS) || '[]');
    return answers.sort((a, b) => new Date(b.answer_time) - new Date(a.answer_time));
  } catch (error) {
    console.error('获取答题记录失败:', error);
    return [];
  }
};

// 获取所有练习会话
export const getAllSessions = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
    return sessions.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
  } catch (error) {
    console.error('获取练习会话失败:', error);
    return [];
  }
};

// 根据题目ID获取答题记录
export const getAnswersByQuestionId = (questionId) => {
  try {
    const answers = JSON.parse(localStorage.getItem(KEYS.ANSWERS) || '[]');
    return answers.filter(answer => answer.question_id === questionId);
  } catch (error) {
    console.error('根据题目ID获取答题记录失败:', error);
    return [];
  }
};

// 获取统计数据
export const getStatistics = () => {
  try {
    const questions = getAllQuestions();
    const answers = getAllAnswers();
    const sessions = getAllSessions();
    
    // 计算正确率
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const totalAnswers = answers.length;
    const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers * 100).toFixed(1) : 0;
    
    // 计算各难度练习次数
    const difficultyStats = {};
    sessions.forEach(session => {
      difficultyStats[session.difficulty] = (difficultyStats[session.difficulty] || 0) + 1;
    });
    
    // 计算各关键词练习次数
    const keywordStats = {};
    sessions.forEach(session => {
      if (session.keyword) {
        keywordStats[session.keyword] = (keywordStats[session.keyword] || 0) + 1;
      }
    });
    
    return {
      totalQuestions: questions.length,
      totalAnswers: totalAnswers,
      totalSessions: sessions.length,
      accuracy: parseFloat(accuracy),
      difficultyStats,
      keywordStats,
      recentQuestions: questions.slice(0, 5), // 最近5个题目
      recentSessions: sessions.slice(0, 5) // 最近5个会话
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      totalQuestions: 0,
      totalAnswers: 0,
      totalSessions: 0,
      accuracy: 0,
      difficultyStats: {},
      keywordStats: {},
      recentQuestions: [],
      recentSessions: []
    };
  }
};

// 清空数据库（仅用于测试）
export const clearDatabase = () => {
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([]));
  localStorage.setItem(KEYS.ANSWERS, JSON.stringify([]));
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
  console.log('数据库已清空');
};

// 导出数据库
export const exportDatabase = () => {
  try {
    const data = {
      questions: getAllQuestions(),
      answers: getAllAnswers(),
      sessions: getAllSessions(),
      exported_at: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      data,
      downloadUrl: url,
      filename: `ielts_practice_backup_${new Date().toISOString().split('T')[0]}.json`
    };
  } catch (error) {
    console.error('导出数据库失败:', error);
    return { success: false, error: error.message };
  }
};

// 导入数据库
export const importDatabase = (jsonData) => {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (data.questions && Array.isArray(data.questions)) {
      localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(data.questions));
    }
    
    if (data.answers && Array.isArray(data.answers)) {
      localStorage.setItem(KEYS.ANSWERS, JSON.stringify(data.answers));
    }
    
    if (data.sessions && Array.isArray(data.sessions)) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(data.sessions));
    }
    
    console.log('数据库导入成功');
    return { success: true };
  } catch (error) {
    console.error('导入数据库失败:', error);
    return { success: false, error: error.message };
  }
};