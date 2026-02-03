import React, { useState, useEffect } from 'react'
import { generateQuestions } from '../services/api'

const Listening = () => {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateQuestions('listening', difficulty, 1)
      setQuestions(data)
    } catch (err) {
      setError('生成题目失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  if (loading) {
    return <div className="section">
      <h2>听力练习</h2>
      <div className="loading">生成题目中...</div>
    </div>
  }

  if (error) {
    return <div className="section">
      <h2>听力练习</h2>
      <div className="error">{error}</div>
      <button onClick={fetchQuestions}>重试</button>
    </div>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>听力练习</h2>
        <div className="difficulty-selector">
          <label>难度：</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          <button onClick={fetchQuestions}>重新生成</button>
        </div>
      </div>
      
      {questions && questions.data.sections && questions.data.sections.map((section) => (
        <div key={section.id} className="listening-section">
          <h3>{section.title}</h3>
          <div className="audio-player">
            <audio controls>
              <source src={section.audio_url} type="audio/mpeg" />
              您的浏览器不支持音频播放
            </audio>
          </div>
          <div className="questions">
            {section.questions.map((q) => (
              <div key={q.id} className="question">
                <p>{q.question}</p>
                {q.type === 'multiple_choice' && (
                  <div className="options">
                    {q.options.map((option, index) => (
                      <div key={index} className="option">
                        <input type="radio" name={`q${q.id}`} value={option} />
                        <label>{option}</label>
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'fill_blank' && (
                  <div className="fill-blank">
                    <input type="text" placeholder="请输入答案" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Listening
