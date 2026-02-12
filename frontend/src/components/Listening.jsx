import React, { useState, useEffect, useRef } from 'react'
import { generateQuestions } from '../services/api'

const Listening = () => {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [keyword, setKeyword] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [userAnswers, setUserAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  
  const audioRefs = useRef({})
  
  // 支持的关键词示例
  const keywordExamples = [
    '租房', '银行', '旅游', '图书馆', '大学', '餐厅',
    '购物', '医院', '面试', '交通', '住宿', '旅行'
  ]

  const fetchQuestions = async (useKeyword = false) => {
    setLoading(true)
    setError(null)
    setUserAnswers({})
    setSubmitted(false)
    setScore(null)
    setShowTranscript(false)
    try {
      const data = await generateQuestions('listening', difficulty, 1, useKeyword ? keyword : null)
      setQuestions(data)
    } catch (err) {
      setError('生成题目失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  // 根据关键词生成题目
  const fetchQuestionsByKeyword = async () => {
    if (!keyword.trim()) {
      setError('请输入关键词')
      return
    }
    await fetchQuestions(true)
  }

  // 移除自动加载，让用户手动点击按钮生成题目
  // useEffect(() => {
  //   fetchQuestions()
  // }, [])

  // 处理答案输入
  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // 提交答案
  const handleSubmit = () => {
    if (!questions || !questions.data.sections) return
    
    let correctCount = 0
    let totalCount = 0
    
    questions.data.sections.forEach(section => {
      section.questions.forEach(q => {
        totalCount++
        const userAnswer = userAnswers[q.id]
        if (userAnswer && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
          correctCount++
        }
      })
    })
    
    const calculatedScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    setScore(calculatedScore)
    setSubmitted(true)
  }

  // 获取音频URL（处理base64或普通URL）
  const getAudioUrl = (section) => {
    if (section.audio_base64) {
      return `data:audio/mp3;base64,${section.audio_base64}`
    }
    return section.audio_url || ''
  }

  // 播放/暂停音频
  const toggleAudio = (sectionId) => {
    const audio = audioRefs.current[sectionId]
    if (audio) {
      if (audio.paused) {
        audio.play()
      } else {
        audio.pause()
      }
    }
  }

  if (loading) {
    return <div className="section">
      <h2>听力练习</h2>
      <div className="loading">生成题目中...</div>
      <div className="loading-note">正在生成音频内容，这可能需要几秒钟...</div>
    </div>
  }

  if (error) {
    return <div className="section">
      <h2>听力练习</h2>
      <div className="error">{error}</div>
      <button onClick={() => fetchQuestions(false)}>重试</button>
    </div>
  }

  // 初始状态：没有题目时显示提示信息
  if (!questions) {
    return (
      <div className="section">
        <div className="section-header">
          <h2>听力练习</h2>
          <div className="controls-container">
            <div className="keyword-controls">
              <div className="keyword-input-group">
                <label htmlFor="keyword-input">场景关键词：</label>
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="输入关键词，如：租房、银行、旅游..."
                  className="keyword-input"
                />
                <button
                  onClick={fetchQuestionsByKeyword}
                  className="keyword-btn"
                  disabled={loading || !keyword.trim()}
                >
                  根据关键词生成
                </button>
              </div>
              <div className="keyword-examples">
                <span className="examples-label">示例：</span>
                {keywordExamples.map((example, index) => (
                  <button
                    key={index}
                    className="example-btn"
                    onClick={() => {
                      setKeyword(example)
                      setTimeout(() => fetchQuestionsByKeyword(), 100)
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="difficulty-selector">
              <label>难度：</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <button onClick={() => fetchQuestions(false)}>随机生成</button>
            </div>
          </div>
        </div>
        
        <div className="initial-prompt">
          <div className="prompt-card">
            <h3>欢迎使用听力练习</h3>
            <p>请选择以下方式开始练习：</p>
            <div className="prompt-options">
              <div className="prompt-option">
                <h4>1. 使用关键词生成</h4>
                <p>输入场景关键词（如：银行、租房、旅游），系统将生成相关对话和题目。</p>
              </div>
              <div className="prompt-option">
                <h4>2. 随机生成</h4>
                <p>点击"随机生成"按钮，系统将随机选择一个场景生成题目。</p>
              </div>
              <div className="prompt-option">
                <h4>3. 选择难度</h4>
                <p>通过上方的难度选择器调整题目难度（简单/中等/困难）。</p>
              </div>
            </div>
            <div className="prompt-action">
              <button
                onClick={() => fetchQuestions(false)}
                className="start-btn"
              >
                开始随机练习
              </button>
              <p className="prompt-hint">或使用上方关键词输入框生成特定场景题目</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>听力练习</h2>
        <div className="controls-container">
          <div className="keyword-controls">
            <div className="keyword-input-group">
              <label htmlFor="keyword-input">场景关键词：</label>
              <input
                id="keyword-input"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入关键词，如：租房、银行、旅游..."
                className="keyword-input"
              />
              <button
                onClick={fetchQuestionsByKeyword}
                className="keyword-btn"
                disabled={loading || !keyword.trim()}
              >
                根据关键词生成
              </button>
            </div>
            <div className="keyword-examples">
              <span className="examples-label">示例：</span>
              {keywordExamples.map((example, index) => (
                <button
                  key={index}
                  className="example-btn"
                  onClick={() => {
                    setKeyword(example)
                    setTimeout(() => fetchQuestionsByKeyword(), 100)
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          
          <div className="difficulty-selector">
            <label>难度：</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
            <button onClick={() => fetchQuestions(false)}>随机生成</button>
            <button onClick={handleSubmit} disabled={submitted}>提交答案</button>
            {score !== null && (
              <div className="score-display">
                得分: <span className={score >= 70 ? 'score-good' : score >= 50 ? 'score-medium' : 'score-poor'}>{score}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {questions && questions.data.sections && questions.data.sections.map((section) => {
        const audioUrl = getAudioUrl(section)
        
        return (
          <div key={section.id} className="listening-section">
            <div className="section-info">
              <h3>{section.title}</h3>
              <div className="section-meta">
                <span className="scenario">场景: {section.scenario || '大学对话'}</span>
                <span className="participants">参与者: {section.participants ? section.participants.join(', ') : '学生A, 学生B'}</span>
                {section.audio_duration > 0 && (
                  <span className="duration">时长: {section.audio_duration}秒</span>
                )}
              </div>
            </div>
            
            <div className="audio-player-container">
              <div className="audio-player">
                <audio
                  ref={el => audioRefs.current[section.id] = el}
                  controls
                  src={audioUrl}
                >
                  您的浏览器不支持音频播放
                </audio>
                <div className="audio-controls">
                  <button onClick={() => toggleAudio(section.id)} className="play-pause-btn">
                    {audioRefs.current[section.id] && !audioRefs.current[section.id].paused ? '暂停' : '播放'}
                  </button>
                  <button onClick={() => setShowTranscript(!showTranscript)} className="transcript-btn">
                    {showTranscript ? '隐藏字幕' : '显示字幕'}
                  </button>
                </div>
              </div>
              
              {showTranscript && section.dialogue_text && (
                <div className="transcript">
                  <h4>对话文本:</h4>
                  <div className="transcript-content">
                    {section.dialogue_text.split('\n').map((line, idx) => (
                      <div key={idx} className="dialogue-line">{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="questions">
              <h4>问题 ({section.questions.length} 题):</h4>
              {section.questions.map((q) => {
                const isCorrect = submitted && userAnswers[q.id] &&
                  userAnswers[q.id].trim().toLowerCase() === q.answer.trim().toLowerCase()
                const isIncorrect = submitted && userAnswers[q.id] && !isCorrect
                
                return (
                  <div key={q.id} className={`question ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''}`}>
                    <p className="question-text">
                      {q.id}. {q.question}
                      {submitted && (
                        <span className="correct-answer"> (正确答案: {q.answer})</span>
                      )}
                    </p>
                    
                    {q.type === 'multiple_choice' && (
                      <div className="options">
                        {q.options.map((option, index) => {
                          const optionId = `q${q.id}_opt${index}`
                          const isSelected = userAnswers[q.id] === option
                          const isCorrectOption = option === q.answer
                          
                          return (
                            <div key={index} className={`option ${isSelected ? 'selected' : ''} ${submitted && isCorrectOption ? 'correct-option' : ''}`}>
                              <input
                                type="radio"
                                id={optionId}
                                name={`q${q.id}`}
                                value={option}
                                checked={isSelected}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                disabled={submitted}
                              />
                              <label htmlFor={optionId}>{option}</label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    {q.type === 'fill_blank' && (
                      <div className="fill-blank">
                        <input
                          type="text"
                          placeholder="请输入答案"
                          value={userAnswers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          disabled={submitted}
                          className={isCorrect ? 'correct-input' : isIncorrect ? 'incorrect-input' : ''}
                        />
                        {submitted && (
                          <div className="answer-feedback">
                            {isCorrect ? '✓ 正确' : '✗ 错误'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {q.type === 'true_false_not_given' && (
                      <div className="true-false-options">
                        {['True', 'False', 'Not Given'].map((option) => {
                          const optionId = `q${q.id}_${option}`
                          const isSelected = userAnswers[q.id] === option
                          const isCorrectOption = option === q.answer
                          
                          return (
                            <div key={option} className={`option ${isSelected ? 'selected' : ''} ${submitted && isCorrectOption ? 'correct-option' : ''}`}>
                              <input
                                type="radio"
                                id={optionId}
                                name={`q${q.id}`}
                                value={option}
                                checked={isSelected}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                disabled={submitted}
                              />
                              <label htmlFor={optionId}>{option}</label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      
      {/* 提交答案按钮 */}
      {questions && questions.data.sections && questions.data.sections.length > 0 && !submitted && (
        <div className="submit-section">
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={Object.keys(userAnswers).length === 0}
          >
            提交答案
          </button>
          <p className="submit-hint">
            {Object.keys(userAnswers).length === 0
              ? '请先选择答案再提交'
              : `已回答 ${Object.keys(userAnswers).length} 个问题`}
          </p>
        </div>
      )}
      
      {submitted && score !== null && (
        <div className="results-summary">
          <h3>测试结果</h3>
          <div className="score-breakdown">
            <div className="score-circle">
              <div className="score-value">{score}%</div>
              <div className="score-label">正确率</div>
            </div>
            <div className="score-details">
              <p>难度: {difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}</p>
              <p>建议: {score >= 80 ? '优秀！继续保持。' : score >= 60 ? '良好，需要更多练习。' : '需要加强听力练习。'}</p>
              <button onClick={fetchQuestions} className="try-again-btn">再试一次</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Listening
