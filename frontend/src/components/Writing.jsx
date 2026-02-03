import React, { useState, useEffect } from 'react'
import { generateQuestions } from '../services/api'

const Writing = () => {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [answers, setAnswers] = useState({
    task1: '',
    task2: ''
  })

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateQuestions('writing', difficulty, 1)
      setQuestions(data)
      setAnswers({ task1: '', task2: '' })
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

  const handleAnswerChange = (taskType, value) => {
    setAnswers(prev => ({
      ...prev,
      [taskType]: value
    }))
  }

  if (loading) {
    return <div className="section">
      <h2>写作练习</h2>
      <div className="loading">生成题目中...</div>
    </div>
  }

  if (error) {
    return <div className="section">
      <h2>写作练习</h2>
      <div className="error">{error}</div>
      <button onClick={fetchQuestions}>重试</button>
    </div>
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>写作练习</h2>
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
      
      {questions && questions.data.tasks && questions.data.tasks.map((task) => (
        <div key={task.id} className="writing-task">
          <h3>{task.type === 'task1' ? 'Task 1: 图表题' : 'Task 2: 议论文'}</h3>
          <h4>{task.title}</h4>
          <div className="task-description">
            <p>{task.description}</p>
            <p className="requirements">{task.requirements}</p>
          </div>
          <div className="answer-area">
            <textarea 
              rows={10} 
              placeholder="请在此处输入您的答案..." 
              value={answers[task.type]} 
              onChange={(e) => handleAnswerChange(task.type, e.target.value)}
            />
            <div className="word-count">
              字数：{answers[task.type].length}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Writing
