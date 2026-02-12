import React, { useState, useEffect } from 'react'
import { generateQuestions } from '../services/api'
import { saveQuestion, saveAnswer, saveSession, initDatabase } from '../services/database'

const Reading = () => {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [keyword, setKeyword] = useState('')
  const [userAnswers, setUserAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  // 百炼生成相关状态
  const [useDify, setUseDify] = useState(false)
  const [topic, setTopic] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState(6.5)  // 难度: 5.5-8.0
  const [questionCount, setQuestionCount] = useState(10)  // 题目数量: 5-13
  const [passageLength, setPassageLength] = useState(800)  // 文章长度: 500-1200

  // 初始化数据库
  useEffect(() => {
    initDatabase()
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    setUserAnswers({})
    setSubmitted(false)
    setScore(null)
    try {
      const data = await generateQuestions(
        'reading',
        difficultyLevel,  // 使用Dify专用的难度
        1,
        keyword,
        useDify,
        topic,  // 英文主题
        '',
        questionCount,  // 5-13
        passageLength   // 500-1200
      )
      setQuestions(data)
      
      // 保存题目到数据库
      const savedQuestion = saveQuestion({
        section: 'reading',
        difficulty,
        keyword: keyword || null,
        useDify,
        topic: topic || null,
        questionCount,
        passageLength,
        content: data
      })
      
      if (savedQuestion) {
        console.log('题目已保存到数据库，ID:', savedQuestion.id)
      }
    } catch (err) {
      setError('生成题目失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 处理答案输入
  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // 处理答案提交
  const handleAnswerSubmit = (questionId, questionIndex, userAnswer, correctAnswer) => {
    // 这里简化处理，实际应该根据题目类型判断是否正确
    const isCorrect = userAnswer === correctAnswer
    
    // 保存答题记录
    const savedAnswer = saveAnswer(questionId, questionIndex, userAnswer, isCorrect)
    
    if (savedAnswer) {
      console.log('答题记录已保存，ID:', savedAnswer.id)
    }
    
    return isCorrect
  }

  // 提交所有答案
  const handleSubmitAll = () => {
    if (!questions || !questions.data.passages) return
    
    let correctCount = 0
    let totalCount = 0
    
    questions.data.passages.forEach(passage => {
      passage.questions.forEach(q => {
        totalCount++
        const userAnswer = userAnswers[q.id]
        if (userAnswer) {
          const isCorrect = handleAnswerSubmit(q.id, q.id, userAnswer, q.answer)
          if (isCorrect) correctCount++
        }
      })
    })
    
    const calculatedScore = totalCount > 0 ? correctCount / totalCount : 0
    setScore(calculatedScore)
    setSubmitted(true)
    
    // 保存会话记录
    const savedSession = saveSession(keyword || 'general', difficulty, calculatedScore)
    if (savedSession) {
      console.log('练习会话已保存，ID:', savedSession.id)
    }
    
    alert(`提交完成！\n正确：${correctCount}/${totalCount}\n得分：${(calculatedScore * 100).toFixed(1)}%`)
  }

  // 处理会话完成
  const handleSessionComplete = () => {
    if (questions) {
      // 这里简化处理，实际应该计算分数
      const score = 0.8 // 假设分数为80%
      const savedSession = saveSession(keyword || 'general', difficulty, score)
      
      if (savedSession) {
        console.log('练习会话已保存，ID:', savedSession.id)
        alert('练习完成！分数：' + (score * 100) + '%')
      }
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  if (loading) {
    return <div className="section">
      <h2>阅读练习</h2>
      <div className="loading">生成题目中...</div>
    </div>
  }

  if (error) {
    return <div className="section">
      <h2>阅读练习</h2>
      <div className="error">{error}</div>
      <button onClick={fetchQuestions}>重试</button>
    </div>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>阅读练习</h2>
        <div className="controls">
          <div className="keyword-input">
            <label>关键词：</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例如：globalization, technology, environment"
            />
          </div>
          <div className="difficulty-selector">
            <label>难度：</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
          
          {/* 百炼生成选项 */}
          <div className="dify-toggle">
            <label>
              <input
                type="checkbox"
                checked={useDify}
                onChange={(e) => setUseDify(e.target.checked)}
              />
              百炼生成 (使用Dify工作流)
            </label>
          </div>
          
          <button onClick={fetchQuestions} className="generate-btn">
            {questions ? '重新生成' : '生成题目'}
          </button>
        </div>
        
        {/* 百炼生成配置面板 */}
        {useDify && (
          <div className="dify-config-panel">
            <h4>百炼生成配置 (Dify AI)</h4>
            <div className="dify-config-grid">
              <div className="dify-config-item">
                <label>难度 (5.5-8.0)：</label>
                <input
                  type="number"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(parseFloat(e.target.value))}
                  min="5.5"
                  max="8.0"
                  step="0.5"
                />
              </div>
              <div className="dify-config-item">
                <label>主题 (英文)：</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Environment"
                />
              </div>
              <div className="dify-config-item">
                <label>题目数量 (5-13)：</label>
                <select value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value))}>
                  {[5,6,7,8,9,10,11,12,13].map(num => (
                    <option key={num} value={num}>{num}题</option>
                  ))}
                </select>
              </div>
              <div className="dify-config-item">
                <label>文章长度 (500-1200词)：</label>
                <input
                  type="number"
                  value={passageLength}
                  onChange={(e) => setPassageLength(parseInt(e.target.value))}
                  min="500"
                  max="1200"
                  step="50"
                />
              </div>
            </div>
            <div className="dify-note">
              <p>💡 百炼生成使用Dify AI工作流，生成更精准、更符合雅思标准的阅读题目。</p>
              <p>生成时间可能较长（60-90秒），请耐心等待。</p>
            </div>
          </div>
        )}
      </div>
      
      {questions && questions.data.passages && questions.data.passages.map((passage) => (
        <div key={passage.id} className="reading-passage">
          <h3>{passage.title}</h3>
          <div className="passage-content">
            {passage.content}
          </div>
          <div className="questions">
            {passage.questions.map((q) => (
              <div key={q.id} className="question">
                <p>{q.question}</p>
                {q.type === 'multiple_choice' && (
                  <div className="options">
                    {q.options.map((option, index) => (
                      <div key={index} className="option">
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={option}
                          checked={userAnswers[q.id] === option}
                          onChange={() => handleAnswerChange(q.id, option)}
                          disabled={submitted}
                        />
                        <label>{option}</label>
                        {submitted && option === q.answer && (
                          <span className="correct-answer">✓ 正确答案</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'true_false_not_given' && (
                  <div className="options">
                    {['True', 'False', 'Not Given'].map((option) => (
                      <div key={option} className="option">
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={option}
                          checked={userAnswers[q.id] === option}
                          onChange={() => handleAnswerChange(q.id, option)}
                          disabled={submitted}
                        />
                        <label>{option}</label>
                        {submitted && option === q.answer && (
                          <span className="correct-answer">✓ 正确答案</span>
                        )}
                      </div>
                    ))}
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
                    />
                    {submitted && (
                      <div className="answer-feedback">
                        <span>你的答案：{userAnswers[q.id] || '未填写'}</span>
                        <span className="correct-answer">正确答案：{q.answer}</span>
                      </div>
                    )}
                  </div>
                )}
                {submitted && (
                  <div className="question-feedback">
                    {userAnswers[q.id] === q.answer ? (
                      <span className="correct">✓ 回答正确</span>
                    ) : (
                      <span className="incorrect">✗ 回答错误</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {questions && questions.data.passages && (
        <div className="submit-section">
          <button
            onClick={handleSubmitAll}
            className="submit-btn"
            disabled={submitted}
          >
            {submitted ? '已提交' : '提交答案'}
          </button>
          
          {submitted && score !== null && (
            <div className="score-display">
              <h3>得分：{(score * 100).toFixed(1)}%</h3>
              <p>正确答案已显示在题目下方</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Reading
