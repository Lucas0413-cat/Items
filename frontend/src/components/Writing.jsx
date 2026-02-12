import React, { useState, useEffect } from 'react'
import { generateQuestions, evaluateWriting } from '../services/api'

const Writing = () => {
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState({})
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [answers, setAnswers] = useState({
    task1: '',
    task2: ''
  })
  const [evaluations, setEvaluations] = useState({})

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateQuestions('writing', difficulty, 1)
      setQuestions(data)
      setAnswers({ task1: '', task2: '' })
      setEvaluations({}) // 清除之前的批改结果
    } catch (err) {
      setError('生成题目失败，请重试')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 提交作文进行批改
  const evaluateEssay = async (task) => {
    const taskType = task.type
    const userEssay = answers[taskType]
    
    if (!userEssay.trim()) {
      setError('请先输入作文内容')
      return
    }
    
    if (userEssay.split(/\s+/).length < 50) {
      setError('作文内容过短，请至少写50个单词')
      return
    }
    
    setEvaluating(prev => ({ ...prev, [taskType]: true }))
    setError(null)
    
    try {
      const requestData = {
        task_id: task.id,
        task_type: task.type,
        task_title: task.title,
        task_description: task.description,
        task_requirements: task.requirements,
        user_essay: userEssay,
        difficulty: difficulty
      }
      
      const evaluationResult = await evaluateWriting(requestData)
      
      // 保存批改结果
      setEvaluations(prev => ({
        ...prev,
        [taskType]: evaluationResult
      }))
      
    } catch (err) {
      console.error('批改失败:', err)
      setError(`批改失败: ${err.message}`)
    } finally {
      setEvaluating(prev => ({ ...prev, [taskType]: false }))
    }
  }

  // 重新生成题目时清除批改结果
  const handleRegenerate = () => {
    setEvaluations({})
    fetchQuestions()
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
          <button onClick={handleRegenerate}>重新生成</button>
        </div>
      </div>
      
      {questions && questions.data.tasks && questions.data.tasks.map((task) => {
        const taskType = task.type
        const evaluation = evaluations[taskType]
        const isEvaluating = evaluating[taskType] || false
        
        return (
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
                value={answers[taskType]}
                onChange={(e) => handleAnswerChange(taskType, e.target.value)}
                disabled={isEvaluating}
              />
              <div className="word-count">
                字数：{answers[taskType].length} 字符 | 单词：{answers[taskType].split(/\s+/).filter(w => w.length > 0).length}
              </div>
            </div>
            
            <div className="evaluation-controls">
              <button
                onClick={() => evaluateEssay(task)}
                disabled={isEvaluating || !answers[taskType].trim() || answers[taskType].split(/\s+/).length < 50}
                className="evaluate-btn"
              >
                {isEvaluating ? '批改中...' : '提交批改'}
              </button>
              {answers[taskType].split(/\s+/).length < 50 && (
                <span className="word-count-warning">（至少需要50个单词）</span>
              )}
            </div>
            
            {/* 批改结果展示 */}
            {evaluation && !evaluation.error && (
              <div className="evaluation-result">
                <h4>批改结果</h4>
                
                {/* 总体分数 */}
                <div className="overall-score">
                  <div className="score-circle">
                    <div className="score-value">{evaluation.overall_score}</div>
                    <div className="score-label">总分</div>
                  </div>
                  <div className="score-details">
                    <p><strong>总体反馈：</strong>{evaluation.overall_feedback}</p>
                    <p><strong>字数统计：</strong>{evaluation.word_count} 单词 / {evaluation.character_count} 字符</p>
                    {evaluation.is_mock_data && (
                      <p className="mock-data-note">⚠️ 当前使用模拟批改数据（AI服务可能不可用）</p>
                    )}
                  </div>
                </div>
                
                {/* 各维度评分 */}
                <div className="dimension-scores">
                  <div className="dimension">
                    <h5>任务回应 (Task Response)</h5>
                    <div className="dimension-score">{evaluation.task_response.score}</div>
                    <div className="dimension-details">
                      <p><strong>优点：</strong>{evaluation.task_response.strengths.join('；')}</p>
                      <p><strong>问题：</strong>{evaluation.task_response.weaknesses.join('；')}</p>
                      <p><strong>建议：</strong>{evaluation.task_response.suggestions.join('；')}</p>
                    </div>
                  </div>
                  
                  <div className="dimension">
                    <h5>连贯与衔接 (Coherence & Cohesion)</h5>
                    <div className="dimension-score">{evaluation.coherence_cohesion.score}</div>
                    <div className="dimension-details">
                      <p><strong>优点：</strong>{evaluation.coherence_cohesion.strengths.join('；')}</p>
                      <p><strong>问题：</strong>{evaluation.coherence_cohesion.weaknesses.join('；')}</p>
                      <p><strong>建议：</strong>{evaluation.coherence_cohesion.suggestions.join('；')}</p>
                    </div>
                  </div>
                  
                  <div className="dimension">
                    <h5>词汇资源 (Lexical Resource)</h5>
                    <div className="dimension-score">{evaluation.lexical_resource.score}</div>
                    <div className="dimension-details">
                      <p><strong>优点：</strong>{evaluation.lexical_resource.strengths.join('；')}</p>
                      <p><strong>问题：</strong>{evaluation.lexical_resource.weaknesses.join('；')}</p>
                      <p><strong>建议：</strong>{evaluation.lexical_resource.suggestions.join('；')}</p>
                    </div>
                  </div>
                  
                  <div className="dimension">
                    <h5>语法范围与准确性 (Grammatical Range & Accuracy)</h5>
                    <div className="dimension-score">{evaluation.grammatical_range_accuracy.score}</div>
                    <div className="dimension-details">
                      <p><strong>优点：</strong>{evaluation.grammatical_range_accuracy.strengths.join('；')}</p>
                      <p><strong>问题：</strong>{evaluation.grammatical_range_accuracy.weaknesses.join('；')}</p>
                      <p><strong>建议：</strong>{evaluation.grammatical_range_accuracy.suggestions.join('；')}</p>
                    </div>
                  </div>
                </div>
                
                {/* 重新批改按钮 */}
                <div className="re-evaluate">
                  <button
                    onClick={() => evaluateEssay(task)}
                    disabled={isEvaluating}
                    className="re-evaluate-btn"
                  >
                    重新批改
                  </button>
                </div>
              </div>
            )}
            
            {/* 错误显示 */}
            {evaluation && evaluation.error && (
              <div className="evaluation-error">
                <p>批改失败：{evaluation.error}</p>
                <button onClick={() => evaluateEssay(task)}>重试</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Writing
