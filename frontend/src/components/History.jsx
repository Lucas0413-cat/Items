import React, { useState, useEffect } from 'react'
import { 
  getAllQuestions, 
  getAllAnswers, 
  getAllSessions, 
  getStatistics,
  exportDatabase,
  clearDatabase
} from '../services/database'

const History = () => {
  const [activeTab, setActiveTab] = useState('statistics')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [sessions, setSessions] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(false)

  // 加载数据
  const loadData = () => {
    setLoading(true)
    try {
      setQuestions(getAllQuestions())
      setAnswers(getAllAnswers())
      setSessions(getAllSessions())
      setStatistics(getStatistics())
    } catch (error) {
      console.error('加载历史数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 导出数据
  const handleExport = () => {
    const result = exportDatabase()
    if (result.success) {
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      alert('数据导出成功！')
    } else {
      alert('数据导出失败：' + result.error)
    }
  }

  // 清空数据
  const handleClear = () => {
    if (window.confirm('确定要清空所有历史数据吗？此操作不可撤销！')) {
      clearDatabase()
      loadData()
      alert('数据已清空')
    }
  }

  if (loading) {
    return (
      <div className="section">
        <h2>历史记录</h2>
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>历史记录</h2>
        <div className="controls">
          <button onClick={loadData} className="generate-btn">刷新数据</button>
          <button onClick={handleExport} className="generate-btn" style={{ backgroundColor: '#4CAF50' }}>
            导出数据
          </button>
          <button onClick={handleClear} className="generate-btn" style={{ backgroundColor: '#F44336' }}>
            清空数据
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="tabs" style={{ marginBottom: '2rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          统计概览
        </button>
        <button 
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          题目记录 ({questions.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'answers' ? 'active' : ''}`}
          onClick={() => setActiveTab('answers')}
        >
          答题记录 ({answers.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          练习会话 ({sessions.length})
        </button>
      </div>

      {/* 统计概览 */}
      {activeTab === 'statistics' && statistics && (
        <div className="statistics">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>总题目数</h3>
              <div className="stat-value">{statistics.totalQuestions}</div>
            </div>
            <div className="stat-card">
              <h3>总答题数</h3>
              <div className="stat-value">{statistics.totalAnswers}</div>
            </div>
            <div className="stat-card">
              <h3>总练习次数</h3>
              <div className="stat-value">{statistics.totalSessions}</div>
            </div>
            <div className="stat-card">
              <h3>正确率</h3>
              <div className="stat-value">{statistics.accuracy}%</div>
            </div>
          </div>

          {/* 难度统计 */}
          <div className="stats-section">
            <h3>难度分布</h3>
            <div className="stats-bars">
              {Object.entries(statistics.difficultyStats).map(([difficulty, count]) => (
                <div key={difficulty} className="stat-bar">
                  <div className="stat-bar-label">
                    <span>{difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}</span>
                    <span>{count}次</span>
                  </div>
                  <div className="stat-bar-track">
                    <div 
                      className="stat-bar-fill"
                      style={{ 
                        width: `${(count / statistics.totalSessions) * 100}%`,
                        backgroundColor: difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FFC107' : '#F44336'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 关键词统计 */}
          {Object.keys(statistics.keywordStats).length > 0 && (
            <div className="stats-section">
              <h3>关键词热度</h3>
              <div className="keyword-tags">
                {Object.entries(statistics.keywordStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([keyword, count]) => (
                    <div key={keyword} className="keyword-tag">
                      <span className="keyword-text">{keyword}</span>
                      <span className="keyword-count">{count}次</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 最近题目 */}
          {statistics.recentQuestions.length > 0 && (
            <div className="stats-section">
              <h3>最近题目</h3>
              <div className="recent-list">
                {statistics.recentQuestions.map((question) => (
                  <div key={question.id} className="recent-item">
                    <div className="recent-item-header">
                      <span className="recent-item-title">
                        {question.section === 'reading' ? '阅读' : 
                         question.section === 'listening' ? '听力' : '写作'}
                      </span>
                      <span className="recent-item-meta">
                        {question.difficulty === 'easy' ? '简单' : 
                         question.difficulty === 'medium' ? '中等' : '困难'}
                        {question.keyword && ` · ${question.keyword}`}
                      </span>
                    </div>
                    <div className="recent-item-date">{formatDate(question.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 题目记录 */}
      {activeTab === 'questions' && (
        <div className="questions-list">
          {questions.length === 0 ? (
            <div className="empty-state">暂无题目记录</div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className="question-card">
                <div className="question-card-header">
                  <h3>
                    {question.section === 'reading' ? '阅读练习' : 
                     question.section === 'listening' ? '听力练习' : '写作练习'}
                  </h3>
                  <div className="question-card-meta">
                    <span className={`difficulty-badge ${question.difficulty}`}>
                      {question.difficulty === 'easy' ? '简单' : 
                       question.difficulty === 'medium' ? '中等' : '困难'}
                    </span>
                    {question.keyword && <span className="keyword-badge">{question.keyword}</span>}
                  </div>
                </div>
                <div className="question-card-content">
                  <div className="question-card-date">
                    <strong>生成时间：</strong>{formatDate(question.created_at)}
                  </div>
                  {question.content && question.content.data && (
                    <div className="question-card-preview">
                      {question.section === 'reading' && question.content.data.passages && (
                        <div>
                          <strong>文章标题：</strong>
                          {question.content.data.passages[0]?.title || '无标题'}
                        </div>
                      )}
                      {question.section === 'writing' && question.content.data.tasks && (
                        <div>
                          <strong>写作任务：</strong>
                          {question.content.data.tasks.length} 个任务
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 答题记录 */}
      {activeTab === 'answers' && (
        <div className="answers-list">
          {answers.length === 0 ? (
            <div className="empty-state">暂无答题记录</div>
          ) : (
            answers.map((answer) => (
              <div key={answer.id} className="answer-card">
                <div className="answer-card-header">
                  <h3>答题记录 #{answer.id}</h3>
                  <div className={`answer-status ${answer.is_correct ? 'correct' : 'incorrect'}`}>
                    {answer.is_correct ? '正确' : '错误'}
                  </div>
                </div>
                <div className="answer-card-content">
                  <div className="answer-card-info">
                    <div><strong>题目ID：</strong>{answer.question_id}</div>
                    <div><strong>题目索引：</strong>{answer.question_index}</div>
                    <div><strong>你的答案：</strong>{answer.user_answer || '未填写'}</div>
                  </div>
                  <div className="answer-card-date">
                    <strong>答题时间：</strong>{formatDate(answer.answer_time)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 练习会话 */}
      {activeTab === 'sessions' && (
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state">暂无练习会话记录</div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="session-card">
                <div className="session-card-header">
                  <h3>练习会话 #{session.id}</h3>
                  <div className="session-score">
                    分数：<span className="score-value">{Math.round(session.score * 100)}%</span>
                  </div>
                </div>
                <div className="session-card-content">
                  <div className="session-card-info">
                    <div><strong>关键词：</strong>{session.keyword || '未指定'}</div>
                    <div><strong>难度：</strong>
                      <span className={`difficulty-badge ${session.difficulty}`}>
                        {session.difficulty === 'easy' ? '简单' : 
                         session.difficulty === 'medium' ? '中等' : '困难'}
                      </span>
                    </div>
                  </div>
                  <div className="session-card-date">
                    <strong>完成时间：</strong>{formatDate(session.completed_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default History