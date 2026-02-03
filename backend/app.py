from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json

# 加载环境变量
load_dotenv()

app = Flask(__name__)
CORS(app)

# 数据模型定义
class GenerateQuestionsRequest(BaseModel):
    section: str = Field(..., description="考试板块: reading, listening, writing")
    difficulty: Optional[str] = Field(default="medium", description="难度级别: easy, medium, hard")
    count: Optional[int] = Field(default=1, description="生成的题目数量")

class ReadingPassage(BaseModel):
    id: int
    title: str
    content: str
    questions: List[Dict[str, Any]]

class ListeningSection(BaseModel):
    id: int
    title: str
    audio_url: str
    questions: List[Dict[str, Any]]

class WritingTask(BaseModel):
    id: int
    type: str
    title: str
    description: str
    requirements: str

class QuestionsResponse(BaseModel):
    section: str
    difficulty: str
    data: Dict[str, Any]

# 集成Qwen-max模型
def call_qwen_api(prompt):
    """调用Qwen-max模型API"""
    import requests
    
    api_key = os.getenv('QWEN_API_KEY')
    api_url = os.getenv('QWEN_API_URL', 'https://api.example.com/qwen-max')
    
    if not api_key:
        # 如果没有API密钥，返回模拟数据
        return None
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    data = {
        'prompt': prompt,
        'max_tokens': 2000,
        'temperature': 0.7
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Qwen API调用失败: {e}")
        return None

def generate_ielts_questions(section, difficulty, count=1):
    """生成雅思模拟试题"""
    # 生成Qwen模型提示词
    def generate_prompt(section, difficulty):
        if section == 'reading':
            return f"请生成一篇雅思阅读文章，难度为{difficulty}，主题为历史或文化相关。文章长度约300-400词。然后基于该文章生成3个问题，包括1个选择题、1个判断题和1个填空题，并提供正确答案。请以JSON格式返回，包含title、content和questions字段。"
        elif section == 'listening':
            return f"请生成一个雅思听力场景，难度为{difficulty}，场景为学生对话或讲座。然后基于该场景生成2个问题，包括1个选择题和1个填空题，并提供正确答案。请以JSON格式返回，包含title、audio_url和questions字段。"
        elif section == 'writing':
            return f"请生成两道雅思写作题目，难度为{difficulty}。Task 1为图表题，Task 2为议论文。请以JSON格式返回，包含tasks数组，每个任务包含type、title、description和requirements字段。"
    
    # 调用Qwen-max模型
    prompt = generate_prompt(section, difficulty)
    qwen_response = call_qwen_api(prompt)
    
    # 如果Qwen模型调用成功，使用其返回的数据
    if qwen_response and 'data' in qwen_response:
        return {
            "section": section,
            "difficulty": difficulty,
            "data": qwen_response['data']
        }
    
    # 如果Qwen模型调用失败，返回模拟数据
    print("使用模拟数据生成题目")
    if section == 'reading':
        passages = []
        for i in range(count):
            passages.append({
                "id": i + 1,
                "title": f"The History of Tea - Part {i + 1}",
                "content": "Tea is one of the most popular beverages in the world. It originated in China around 2737 BC, according to legend, when the Emperor Shen Nong accidentally discovered it. Since then, tea has spread throughout the world, becoming an important part of many cultures. Today, there are many different types of tea, including green tea, black tea, oolong tea, and white tea. Each type has its own unique flavor and health benefits.",
                "questions": [
                    {
                        "id": 1,
                        "type": "multiple_choice",
                        "question": "What is the main topic of the passage?",
                        "options": ["The health benefits of tea", "The history of tea production", "The cultural significance of tea", "The global tea trade"],
                        "answer": "The history of tea production"
                    },
                    {
                        "id": 2,
                        "type": "true_false_not_given",
                        "question": "Tea was discovered in India around 2737 BC.",
                        "answer": "False"
                    },
                    {
                        "id": 3,
                        "type": "fill_blank",
                        "question": "Today, there are many different types of tea, including green tea, black tea, oolong tea, and ______ tea.",
                        "answer": "white"
                    }
                ]
            })
        return {
            "section": "reading",
            "difficulty": difficulty,
            "data": {
                "passages": passages
            }
        }
    elif section == 'listening':
        sections = []
        for i in range(count):
            sections.append({
                "id": i + 1,
                "title": f"Conversation between two students - Part {i + 1}",
                "audio_url": f"https://example.com/audio{i + 1}.mp3",
                "questions": [
                    {
                        "id": 1,
                        "type": "multiple_choice",
                        "question": "What are the students discussing?",
                        "options": ["Their upcoming exam", "A party they attended", "A lecture they missed", "A project they're working on"],
                        "answer": "Their upcoming exam"
                    },
                    {
                        "id": 2,
                        "type": "fill_blank",
                        "question": "The exam will be held on ______.",
                        "answer": "Friday"
                    }
                ]
            })
        return {
            "section": "listening",
            "difficulty": difficulty,
            "data": {
                "sections": sections
            }
        }
    elif section == 'writing':
        tasks = []
        task1 = {
            "id": 1,
            "type": "task1",
            "title": "Bar chart showing population growth",
            "description": "The chart below shows the population growth in three cities from 2000 to 2020. City A had a population of 1 million in 2000, which grew to 1.5 million by 2020. City B's population increased from 800,000 to 1.2 million during the same period. City C's population grew from 500,000 to 900,000.",
            "requirements": "Summarize the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        }
        task2 = {
            "id": 2,
            "type": "task2",
            "title": "The importance of education",
            "description": "Some people believe that education is the most important factor in determining a person's success. Others think that factors such as hard work and luck are more important.",
            "requirements": "To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        }
        tasks.extend([task1, task2])
        return {
            "section": "writing",
            "difficulty": difficulty,
            "data": {
                "tasks": tasks
            }
        }

# API路由
@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    """生成雅思模拟试题"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400
        
        # 验证请求数据
        request_data = GenerateQuestionsRequest(**data)
        section = request_data.section
        difficulty = request_data.difficulty
        count = request_data.count
        
        # 生成题目
        questions = generate_ielts_questions(section, difficulty, count)
        return jsonify(questions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({"status": "healthy", "message": "API is running"})

@app.route('/api/sections', methods=['GET'])
def get_sections():
    """获取可用的考试板块"""
    return jsonify({
        "sections": [
            {"id": "reading", "name": "阅读"},
            {"id": "listening", "name": "听力"},
            {"id": "writing", "name": "写作"}
        ]
    })

@app.route('/api/difficulties', methods=['GET'])
def get_difficulties():
    """获取可用的难度级别"""
    return jsonify({
        "difficulties": [
            {"id": "easy", "name": "简单"},
            {"id": "medium", "name": "中等"},
            {"id": "hard", "name": "困难"}
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
