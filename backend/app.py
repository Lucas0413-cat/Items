from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List, Dict, Any, Union
import json
import base64
from tts_service import tts_service

# 加载环境变量
import os
from pathlib import Path

# 获取当前文件所在目录
current_dir = Path(__file__).parent
env_path = current_dir / '.env'

print(f"当前目录: {current_dir}")
print(f"环境文件路径: {env_path}")
print(f"环境文件存在: {env_path.exists()}")

# 在加载前检查环境变量
print(f"\n加载前环境变量检查:")
print(f"  QWEN_API_URL (加载前): {os.getenv('QWEN_API_URL', '未设置')}")

# 加载环境变量
load_dotenv(dotenv_path=env_path)

print(f"\n加载后环境变量检查:")
print(f"  QWEN_API_URL (加载后): {os.getenv('QWEN_API_URL', '未设置')}")

# 检查关键环境变量
qwem_api_key = os.getenv('QWEN_API_KEY')
print(f"QWEN_API_KEY加载: {'成功' if qwem_api_key else '失败'}")
if qwem_api_key:
    print(f"API密钥长度: {len(qwem_api_key)}")

# 检查API URL
qwem_api_url = os.getenv('QWEN_API_URL')
print(f"QWEN_API_URL加载: {'成功' if qwem_api_url else '失败'}")
if qwem_api_url:
    print(f"API URL: {qwem_api_url}")

app = Flask(__name__)
CORS(app)

# 添加422错误处理器（Pydantic校验错误）
@app.errorhandler(422)
def handle_validation_error(err):
    headers = err.data.get("headers", None)
    messages = err.data.get("messages", ["Invalid request."])
    if headers:
        return jsonify({
            "error": "Validation Error",
            "detail": messages
        }), 422, headers
    else:
        return jsonify({
            "error": "Validation Error",
            "detail": messages
        }), 422

# 数据模型定义
class GenerateQuestionsRequest(BaseModel):
    section: str = Field(..., description="考试板块: reading, listening, writing")
    difficulty: Optional[Union[float, str]] = Field(default=6.5, description="难度级别: 5.5-8.0 或 easy/medium/hard")
    count: Optional[int] = Field(default=1, ge=1, le=10, description="生成的题目数量")
    keyword: Optional[str] = Field(default=None, description="题目关键词，如：globalization, technology, environment等")
    # Dify工作流相关字段
    use_dify: Optional[bool] = Field(default=False, description="是否使用Dify工作流生成")
    topic: Optional[str] = Field(default=None, description="文章主题（Dify工作流使用，英文）")
    user: Optional[str] = Field(default=None, description="用户标识（Dify工作流使用）")
    question_count: Optional[int] = Field(default=10, ge=5, le=13, description="问题数量（Dify工作流使用）")
    passage_length: Optional[int] = Field(default=800, ge=500, le=1200, description="文章长度，词数（Dify工作流使用）")

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

class GenerateAudioByKeywordRequest(BaseModel):
    """根据关键词生成音频的请求模型"""
    keyword: str = Field(..., description="关键词，如：bank, restaurant, travel, shopping等")
    difficulty: Optional[str] = Field(default="medium", description="难度级别: easy, medium, hard")
    language: Optional[str] = Field(default="en", description="语言代码，默认en（英语）")

class WritingEvaluationRequest(BaseModel):
    """写作批改请求模型"""
    task_id: int = Field(..., description="任务ID")
    task_type: str = Field(..., description="任务类型: task1 或 task2")
    task_title: str = Field(..., description="任务标题")
    task_description: str = Field(..., description="任务描述")
    task_requirements: str = Field(..., description="任务要求")
    user_essay: str = Field(..., description="用户作文内容")
    difficulty: Optional[str] = Field(default="medium", description="难度级别: easy, medium, hard")

# 集成Qwen-max模型
def call_qwen_api(prompt):
    """调用Qwen-max模型API"""
    import requests
    import json
    
    # 调试：打印所有相关的环境变量
    print(f"DEBUG: 所有QWEN_环境变量:")
    for key, value in os.environ.items():
        if 'QWEN' in key.upper():
            print(f"  {key}: {value[:20]}..." if len(value) > 20 else f"  {key}: {value}")
    
    api_key = os.getenv('QWEN_API_KEY')
    
    # 硬编码正确的API URL，避免环境变量污染
    api_url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    
    print(f"DEBUG: API密钥: {'已设置' if api_key else '未设置'}")
    if api_key:
        print(f"DEBUG: API密钥长度: {len(api_key)}")
        print(f"DEBUG: API密钥前10位: {api_key[:10]}...")
    
    print(f"DEBUG: 使用硬编码API URL: {api_url}")
    
    if not api_key:
        # 如果没有API密钥，返回模拟数据
        print("警告: 未找到QWEN_API_KEY环境变量，使用模拟数据")
        return None
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    # 阿里云DashScope的请求格式（使用messages格式）
    data = {
        'model': 'qwen-max',  # 指定模型
        'input': {
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
        },
        'parameters': {
            'max_tokens': 2000,
            'temperature': 0.7,
            'result_format': 'message'  # 确保返回消息格式
        }
    }
    
    try:
        print(f"调用Qwen API，Prompt长度: {len(prompt)}字符")
        
        # 增加超时时间并添加重试机制
        max_retries = 3  # 增加重试次数
        timeout = 180  # 增加超时时间到180秒，与Dify工作流一致
        
        for attempt in range(max_retries):
            try:
                print(f"尝试 {attempt + 1}/{max_retries}，超时: {timeout}秒")
                response = requests.post(api_url, headers=headers, json=data, timeout=timeout)
                response.raise_for_status()
                
                result = response.json()
                print(f"Qwen API调用成功，状态码: {response.status_code}")
                
                # 提取响应文本 - 正确的路径
                if 'output' in result and 'choices' in result['output'] and len(result['output']['choices']) > 0:
                    ai_text = result['output']['choices'][0]['message']['content']
                    print(f"提取的AI文本长度: {len(ai_text)}字符")
                    print(f"AI文本预览: {ai_text[:200]}...")
                    return ai_text
                else:
                    print(f"API响应格式异常，没有output.choices字段")
                    print(f"响应结构: {json.dumps(result, ensure_ascii=False)[:500]}...")
                    return None
                    
            except requests.exceptions.Timeout:
                print(f"尝试 {attempt + 1} 超时")
                if attempt < max_retries - 1:
                    print("等待5秒后重试...")
                    import time
                    time.sleep(5)
                else:
                    print("所有重试尝试均超时")
                    raise
            except requests.exceptions.ConnectionError as e:
                print(f"连接错误: {e}")
                if attempt < max_retries - 1:
                    print("等待5秒后重试...")
                    import time
                    time.sleep(5)
                else:
                    print("所有重试尝试均失败")
                    raise
        
    except requests.exceptions.HTTPError as e:
        print(f"Qwen API HTTP错误: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"错误详情: {json.dumps(error_detail, ensure_ascii=False)}")
            except:
                print(f"响应内容: {e.response.text[:500]}")
        return None
    except Exception as e:
        print(f"Qwen API调用失败: {e}")
        return None

def parse_ai_response(response_text, section):
    """解析AI返回的JSON响应"""
    try:
        # 尝试从响应文本中提取JSON部分
        # AI可能会在JSON前后添加一些说明文字
        import re
        
        # 查找JSON对象
        json_pattern = r'\{.*\}'
        match = re.search(json_pattern, response_text, re.DOTALL)
        
        if match:
            json_str = match.group(0)
            data = json.loads(json_str)
            print(f"成功解析AI响应JSON: {json.dumps(data, ensure_ascii=False)[:200]}...")
            return data
        else:
            # 如果没有找到JSON，尝试直接解析整个响应
            try:
                data = json.loads(response_text)
                return data
            except:
                print(f"无法解析AI响应为JSON: {response_text[:200]}...")
                return None
    except Exception as e:
        print(f"解析AI响应时出错: {e}")
        return None

def call_dify_workflow(module, difficulty, topic, user, question_count, passage_length):
    """调用Dify工作流生成题目"""
    try:
        import os
        import requests
        
        # 获取Dify配置
        dify_api_key = os.getenv('DIFY_API_KEY')
        dify_workflow_id = os.getenv('DIFY_WORKFLOW_ID')
        dify_api_url = os.getenv('DIFY_API_URL', 'https://api.dify.ai/v1/workflows/run')
        
        if not dify_api_key or not dify_workflow_id:
            print("警告: DIFY_API_KEY 或 DIFY_WORKFLOW_ID 未配置，无法使用Dify工作流")
            return None
        
        print(f"调用Dify工作流，参数:")
        print(f"  - module: {module}")
        print(f"  - difficulty: {difficulty}")
        print(f"  - topic: {topic}")
        print(f"  - question_count: {question_count}")
        print(f"  - passage_length: {passage_length}")
        
        # 准备请求数据（根据Dify工作流要求的参数格式）
        # difficulty: 数字 5.5-8.0
        # topic: 英文文本
        # question_count: 数字 5-13
        # passage_length: 数字 500-1200
        try:
            difficulty_value = float(difficulty) if difficulty else 6.5
            if difficulty_value < 5.5: difficulty_value = 5.5
            if difficulty_value > 8.0: difficulty_value = 8.0
        except:
            difficulty_value = 6.5
        
        try:
            question_count_value = int(question_count) if question_count else 10
            if question_count_value < 5: question_count_value = 5
            if question_count_value > 13: question_count_value = 13
        except:
            question_count_value = 5
        
        try:
            passage_length_value = int(passage_length) if passage_length else 800
            if passage_length_value < 500: passage_length_value = 500
            if passage_length_value > 1200: passage_length_value = 1200
        except:
            passage_length_value = 800
        
        # 准备请求数据
        request_data = {
            "inputs": {
                "module": module,
                "difficulty": difficulty_value,
                "topic": str(topic) if topic else "general topic",
                "question_count": question_count_value,
                "passage_length": passage_length_value
            }
        }
        
        print(f"Dify参数转换后:")
        print(f"  - difficulty: {difficulty_value} (type: {type(difficulty_value).__name__})")
        print(f"  - topic: {topic}")
        print(f"  - question_count: {question_count_value} (type: {type(question_count_value).__name__})")
        print(f"  - passage_length: {passage_length_value} (type: {type(passage_length_value).__name__})")
        
        headers = {
            "Authorization": f"Bearer {dify_api_key}",
            "Content-Type": "application/json"
        }
        
        # 调用Dify API
        print(f"发送请求到Dify工作流: {dify_api_url}")
        response = requests.post(
            dify_api_url,
            headers=headers,
            json=request_data,
            timeout=180  # 3分钟超时
        )
        
        response.raise_for_status()
        result = response.json()
        
        print(f"Dify工作流调用成功，状态码: {response.status_code}")
        
        # 检查工作流执行状态
        workflow_data = result.get("data", {})
        status = workflow_data.get("status", "unknown")
        error = workflow_data.get("error", "")
        
        if status == "failed":
            print(f"Dify工作流执行失败: {error}")
            print(f"详细信息: elapsed_time={workflow_data.get('elapsed_time', 0)}s, steps={workflow_data.get('total_steps', 0)}")
            return None
        
        # 提取工作流输出
        if "outputs" in workflow_data:
            outputs = workflow_data["outputs"]
            
            # 尝试从输出中提取JSON
            for key, value in outputs.items():
                if isinstance(value, str) and value.strip().startswith('{'):
                    try:
                        json_data = json.loads(value)
                        print(f"从Dify输出中解析JSON成功，键: {key}")
                        return json_data
                    except json.JSONDecodeError:
                        print(f"无法解析Dify输出为JSON，键: {key}")
                        continue
            
            # 如果没有找到JSON，返回整个输出
            print(f"返回Dify原始输出")
            return outputs
        else:
            print(f"Dify响应格式不符合预期，缺少outputs字段: {result}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Dify API请求错误: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"错误详情: {json.dumps(error_detail, ensure_ascii=False)}")
            except:
                print(f"响应内容: {e.response.text[:500]}")
        return None
    except Exception as e:
        print(f"Dify工作流调用失败: {e}")
        return None

def generate_ielts_questions(section, difficulty, count=1, keyword=None,
                            use_dify=False, topic=None, user="ielts_student",
                            question_count=10, passage_length="medium"):
    """生成雅思模拟试题"""
    
    # 如果使用Dify工作流
    if use_dify and section == "reading":
        print(f"使用Dify工作流生成阅读题目")
        print(f"参数: topic={topic}, difficulty={difficulty}, user={user}, question_count={question_count}, passage_length={passage_length}")
        
        # 调用Dify工作流
        dify_result = call_dify_workflow(
            module="reading",
            difficulty=difficulty,
            topic=topic or keyword or "general",
            user=user,
            question_count=question_count,
            passage_length=passage_length
        )
        
        if dify_result:
            print(f"Dify工作流返回结果，尝试解析...")
            
            # 尝试将Dify结果转换为标准格式
            try:
                # Dify可能返回不同的格式，我们需要适配
                if "passages" in dify_result:
                    # 已经是标准格式
                    passages = dify_result["passages"]
                elif "data" in dify_result and "passages" in dify_result["data"]:
                    # 嵌套格式
                    passages = dify_result["data"]["passages"]
                else:
                    # 尝试从输出中提取
                    passages = []
                    for key, value in dify_result.items():
                        if isinstance(value, dict) and "title" in value and "content" in value:
                            passages.append(value)
                    
                    if not passages:
                        # 创建默认格式
                        passages = [{
                            "id": 1,
                            "title": f"Dify生成: {topic or keyword or '阅读文章'}",
                            "content": str(dify_result)[:1000],  # 限制长度
                            "questions": []
                        }]
                
                # 确保每个passage都有questions字段
                for passage in passages:
                    if "questions" not in passage:
                        passage["questions"] = []
                
                print(f"Dify工作流成功生成 {len(passages)} 篇文章")
                return {
                    "section": section,
                    "difficulty": difficulty,
                    "data": {
                        "passages": passages[:count]  # 限制数量
                    },
                    "source": "dify"
                }
                
            except Exception as e:
                print(f"解析Dify结果失败: {e}")
                # 继续使用传统方法
        
        print(f"Dify工作流失败，使用传统方法生成")
    
    def _adjust_questions_by_difficulty(questions, difficulty):
        """根据难度调整问题"""
        adjusted_questions = []
        
        for i, q in enumerate(questions):
            adjusted_q = q.copy()
            
            if difficulty == "easy":
                # 简单难度：减少选项数量，简化问题
                if q["type"] == "multiple_choice":
                    # 只保留2个选项
                    if len(q["options"]) > 2:
                        adjusted_q["options"] = q["options"][:2]
                        # 确保答案在保留的选项中
                        if q["answer"] not in adjusted_q["options"]:
                            adjusted_q["answer"] = adjusted_q["options"][0]
                
                # 简化问题文本
                if "discussing" in q["question"].lower():
                    adjusted_q["question"] = "What is the main topic?"
                elif "held on" in q["question"].lower():
                    adjusted_q["question"] = "When is it?"
                    
            elif difficulty == "hard":
                # 困难难度：增加干扰项，使问题更复杂
                if q["type"] == "multiple_choice":
                    if len(q["options"]) < 4:
                        # 添加更多选项
                        extra_options = ["None of the above", "All of the above", "Not mentioned"]
                        adjusted_q["options"] = q["options"] + extra_options[:4-len(q["options"])]
                
                # 使问题更具体
                if "discussing" in q["question"].lower():
                    adjusted_q["question"] = "What specific aspect are they discussing?"
                elif "held on" in q["question"].lower():
                    adjusted_q["question"] = "On which specific day will it take place?"
            
            adjusted_q["id"] = i + 1
            adjusted_questions.append(adjusted_q)
        
        return adjusted_questions
    
    # 生成Qwen模型提示词
    def generate_prompt(section, difficulty, keyword):
        if section == 'reading':
            if keyword:
                return f"""请生成一篇雅思阅读文章，难度为{difficulty}，主题为{keyword}。文章长度约800-900词，内容详实，适合雅思考试阅读部分。

然后基于该文章生成13个问题，包含多种题型：
1. 5个选择题（multiple_choice），每个包含4个选项
2. 4个判断题（true_false_not_given）
3. 4个填空题（fill_blank）

请以严格的JSON格式返回，格式如下：
{{
  "title": "文章标题",
  "content": "完整的文章内容",
  "questions": [
    {{
      "id": 1,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 2,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 3,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 4,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 5,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 6,
      "type": "true_false_not_given",
      "question": "问题文本",
      "answer": "True/False/Not Given"
    }},
    {{
      "id": 7,
      "type": "true_false_not_given",
      "question": "问题文本",
      "answer": "True/False/Not Given"
    }},
    {{
      "id": 8,
      "type": "true_false_not_given",
      "question": "问题文本",
      "answer": "True/False/Not Given"
    }},
    {{
      "id": 9,
      "type": "true_false_not_given",
      "question": "问题文本",
      "answer": "True/False/Not Given"
    }},
    {{
      "id": 10,
      "type": "fill_blank",
      "question": "问题文本（包含___作为填空位置）",
      "answer": "填空答案"
    }},
    {{
      "id": 11,
      "type": "fill_blank",
      "question": "问题文本（包含___作为填空位置）",
      "answer": "填空答案"
    }},
    {{
      "id": 12,
      "type": "fill_blank",
      "question": "问题文本（包含___作为填空位置）",
      "answer": "填空答案"
    }},
    {{
      "id": 13,
      "type": "fill_blank",
      "question": "问题文本（包含___作为填空位置）",
      "answer": "填空答案"
    }}
  ]
}}"""
            else:
                return f"""请生成一篇雅思阅读文章，难度为{difficulty}，主题为历史或文化相关。文章长度约800-900词，内容详实，适合雅思考试阅读部分。

然后基于该文章生成13个问题，包含多种题型：
1. 5个选择题（multiple_choice），每个包含4个选项
2. 4个判断题（true_false_not_given）
3. 4个填空题（fill_blank）

请以严格的JSON格式返回，格式如上。"""
        elif section == 'listening':
            if keyword:
                return f"""请生成一个雅思听力场景，难度为{difficulty}，主题为{keyword}，场景为学生对话或讲座。

然后基于该场景生成2个问题：
1. 一个选择题（multiple_choice），包含4个选项
2. 一个填空题（fill_blank）

请以严格的JSON格式返回，格式如下：
{{
  "title": "场景标题",
  "audio_url": "https://example.com/audio.mp3",
  "transcript": "对话或讲座的文字稿",
  "questions": [
    {{
      "id": 1,
      "type": "multiple_choice",
      "question": "问题文本",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案"
    }},
    {{
      "id": 2,
      "type": "fill_blank",
      "question": "问题文本（包含___作为填空位置）",
      "answer": "填空答案"
    }}
  ]
}}"""
            else:
                return f"""请生成一个雅思听力场景，难度为{difficulty}，场景为学生对话或讲座。

然后基于该场景生成2个问题：
1. 一个选择题（multiple_choice），包含4个选项
2. 一个填空题（fill_blank）

请以严格的JSON格式返回，格式如上。"""
        elif section == 'writing':
            if keyword:
                return f"""请生成两道雅思写作题目，难度为{difficulty}，主题与{keyword}相关。

Task 1: 图表题（task1）
Task 2: 议论文（task2）

请以严格的JSON格式返回，格式如下：
{{
  "tasks": [
    {{
      "id": 1,
      "type": "task1",
      "title": "图表标题",
      "description": "图表描述",
      "requirements": "写作要求（至少150词）"
    }},
    {{
      "id": 2,
      "type": "task2",
      "title": "议论文题目",
      "description": "题目描述",
      "requirements": "写作要求（至少250词）"
    }}
  ]
}}"""
            else:
                return f"""请生成两道雅思写作题目，难度为{difficulty}。

Task 1: 图表题（task1）
Task 2: 议论文（task2）

请以严格的JSON格式返回，格式如上。"""
    
    # 调用Qwen-max模型
    prompt = generate_prompt(section, difficulty, keyword)
    print(f"生成Prompt: {prompt[:200]}...")
    qwen_response = call_qwen_api(prompt)
    
    # 如果Qwen模型调用成功，解析其返回的数据
    if qwen_response:
        print(f"收到AI响应: {qwen_response[:200]}...")
        parsed_data = parse_ai_response(qwen_response, section)
        
        if parsed_data:
            print(f"成功解析AI数据，类型: {type(parsed_data)}")
            # 根据section类型格式化数据
            if section == 'reading':
                return {
                    "section": section,
                    "difficulty": difficulty,
                    "keyword": keyword,
                    "data": {
                        "passages": [{
                            "id": 1,
                            "title": parsed_data.get("title", "AI生成文章"),
                            "content": parsed_data.get("content", ""),
                            "questions": parsed_data.get("questions", [])
                        }]
                    }
                }
            elif section == 'listening':
                # 为AI生成的听力场景生成音频
                dialogue_text = parsed_data.get("transcript", "") or parsed_data.get("script", "")
                if not dialogue_text:
                    dialogue_text = "This is a sample listening dialogue for IELTS practice."
                
                # 生成音频
                audio_result = tts_service.text_to_speech(dialogue_text)
                
                if audio_result:
                    audio_base64 = audio_result["audio_base64"]
                    audio_filename = audio_result["filename"]
                else:
                    audio_base64 = None
                    audio_filename = None
                
                # 根据难度调整问题
                questions = _adjust_questions_by_difficulty(
                    parsed_data.get("questions", []),
                    difficulty
                )
                
                return {
                    "section": section,
                    "difficulty": difficulty,
                    "keyword": keyword,
                    "data": {
                        "sections": [{
                            "id": 1,
                            "title": parsed_data.get("title", "AI生成听力场景"),
                            "scenario": "ai_generated",
                            "context": parsed_data.get("context", "AI generated listening scene"),
                            "participants": ["Speaker A", "Speaker B"],
                            "dialogue_text": dialogue_text,
                            "audio_base64": audio_base64,
                            "audio_filename": audio_filename,
                            "audio_filesize": audio_result.get("filesize", 0) if audio_result else 0,
                            "audio_duration": audio_result.get("duration_estimate", 0) if audio_result else 0,
                            "questions": questions
                        }]
                    }
                }
            elif section == 'writing':
                return {
                    "section": section,
                    "difficulty": difficulty,
                    "keyword": keyword,
                    "data": {
                        "tasks": parsed_data.get("tasks", [])
                    }
                }
        else:
            print(f"解析AI响应失败，qwen_response类型: {type(qwen_response)}")
            print(f"qwen_response内容: {qwen_response[:500] if qwen_response else 'None'}")
    else:
        print(f"Qwen API调用失败，qwen_response为None")
    
    # 如果Qwen模型调用失败或解析失败，返回模拟数据
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
            # 生成听力对话场景
            scenario_options = ["university", "library", "accommodation", "travel"]
            scenario = scenario_options[i % len(scenario_options)]
            
            # 生成对话内容
            dialogue_data = tts_service.generate_listening_dialogue(scenario, 2)
            
            # 生成音频
            audio_result = tts_service.text_to_speech(dialogue_data["dialogue_text"])
            
            if audio_result:
                # 使用base64编码的音频数据
                audio_base64 = audio_result["audio_base64"]
                audio_filename = audio_result["filename"]
                
                # 根据难度调整问题
                questions = _adjust_questions_by_difficulty(
                    dialogue_data["suggested_questions"],
                    difficulty
                )
                
                sections.append({
                    "id": i + 1,
                    "title": dialogue_data["title"],
                    "scenario": dialogue_data["scenario"],
                    "context": dialogue_data["context"],
                    "participants": dialogue_data["participants"],
                    "dialogue_text": dialogue_data["dialogue_text"],
                    "audio_base64": audio_base64,
                    "audio_filename": audio_filename,
                    "audio_filesize": audio_result["filesize"],
                    "audio_duration": audio_result["duration_estimate"],
                    "questions": questions
                })
            else:
                # 如果TTS失败，使用备用数据
                sections.append({
                    "id": i + 1,
                    "title": f"Conversation between two students - Part {i + 1}",
                    "scenario": "university",
                    "context": "Two students discussing their studies",
                    "participants": ["Student A", "Student B"],
                    "dialogue_text": "Student A: Hello, how are you today? Student B: I'm good, thank you. How about you?",
                    "audio_base64": None,
                    "audio_filename": None,
                    "audio_filesize": 0,
                    "audio_duration": 0,
                    "questions": [
                        {
                            "id": 1,
                            "type": "multiple_choice",
                            "question": "What are the students discussing?",
                            "options": ["Their studies", "A party", "Sports", "Weather"],
                            "answer": "Their studies"
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

# 根路径路由
@app.route('/')
def root():
    """根路径，返回API服务状态"""
    return jsonify({
        "message": "雅思模拟考试API服务正在运行",
        "version": "1.0.0",
        "endpoints": {
            "/api/generate-questions": "生成雅思模拟试题",
            "/api/health": "健康检查",
            "/api/sections": "获取可用的考试板块",
            "/api/difficulties": "获取可用的难度级别"
        }
    })

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
        keyword = request_data.keyword
        
        # 提取Dify工作流相关参数
        use_dify = getattr(request_data, 'use_dify', False)
        topic = getattr(request_data, 'topic', None)
        user = getattr(request_data, 'user', 'ielts_student')
        question_count = getattr(request_data, 'question_count', 10)
        passage_length = getattr(request_data, 'passage_length', 'medium')
        
        print(f"生成题目请求参数:")
        print(f"  - section: {section}")
        print(f"  - difficulty: {difficulty}")
        print(f"  - count: {count}")
        print(f"  - keyword: {keyword}")
        print(f"  - use_dify: {use_dify}")
        print(f"  - topic: {topic}")
        print(f"  - user: {user}")
        print(f"  - question_count: {question_count}")
        print(f"  - passage_length: {passage_length}")
        
        # 生成题目
        questions = generate_ielts_questions(
            section=section,
            difficulty=difficulty,
            count=count,
            keyword=keyword,
            use_dify=use_dify,
            topic=topic,
            user=user,
            question_count=question_count,
            passage_length=passage_length
        )
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

@app.route('/api/generate-audio-by-keyword', methods=['POST'])
def generate_audio_by_keyword():
    """
    根据关键词生成听力音频
    
    支持的关键词示例：
    - bank, money, account (银行场景)
    - restaurant, food, dining (餐厅场景)
    - travel, trip, vacation (旅行场景)
    - shopping, store, buy (购物场景)
    - hospital, doctor, health (医院场景)
    - university, study, education (大学场景)
    - library, book, research (图书馆场景)
    - accommodation, rent, housing (住宿场景)
    - job, interview, employment (工作面试场景)
    - transportation, bus, train (交通场景)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400
        
        # 验证请求数据
        request_data = GenerateAudioByKeywordRequest(**data)
        keyword = request_data.keyword
        difficulty = request_data.difficulty
        language = request_data.language
        
        # 根据关键词获取场景
        scenario = tts_service.get_scenario_by_keyword(keyword)
        
        # 生成对话
        dialogue_data = tts_service.generate_listening_dialogue(scenario, 2)
        
        # 生成音频
        audio_result = tts_service.text_to_speech(dialogue_data["dialogue_text"])
        
        if not audio_result:
            return jsonify({"error": "Failed to generate audio"}), 500
        
        # 根据难度调整问题
        def _adjust_questions_by_difficulty(questions, difficulty):
            """根据难度调整问题"""
            adjusted_questions = []
            
            for i, q in enumerate(questions):
                adjusted_q = q.copy()
                
                if difficulty == "easy":
                    # 简单难度：减少选项数量，简化问题
                    if q["type"] == "multiple_choice":
                        # 只保留2个选项
                        if len(q["options"]) > 2:
                            adjusted_q["options"] = q["options"][:2]
                            # 确保答案在保留的选项中
                            if q["answer"] not in adjusted_q["options"]:
                                adjusted_q["answer"] = adjusted_q["options"][0]
                    
                    # 简化问题文本
                    if "discussing" in q["question"].lower():
                        adjusted_q["question"] = "What is the main topic?"
                    elif "held on" in q["question"].lower():
                        adjusted_q["question"] = "When is it?"
                        
                elif difficulty == "hard":
                    # 困难难度：增加干扰项，使问题更复杂
                    if q["type"] == "multiple_choice":
                        if len(q["options"]) < 4:
                            # 添加更多选项
                            extra_options = ["None of the above", "All of the above", "Not mentioned"]
                            adjusted_q["options"] = q["options"] + extra_options[:4-len(q["options"])]
                    
                    # 使问题更具体
                    if "discussing" in q["question"].lower():
                        adjusted_q["question"] = "What specific aspect are they discussing?"
                    elif "held on" in q["question"].lower():
                        adjusted_q["question"] = "On which specific day will it take place?"
                
                adjusted_q["id"] = i + 1
                adjusted_questions.append(adjusted_q)
            
            return adjusted_questions
        
        # 调整问题难度
        questions = _adjust_questions_by_difficulty(
            dialogue_data["suggested_questions"],
            difficulty
        )
        
        # 构建响应
        response = {
            "keyword": keyword,
            "scenario": scenario,
            "difficulty": difficulty,
            "language": language,
            "data": {
                "title": dialogue_data["title"],
                "context": dialogue_data["context"],
                "participants": dialogue_data["participants"],
                "dialogue_text": dialogue_data["dialogue_text"],
                "audio_base64": audio_result["audio_base64"],
                "audio_filename": audio_result["filename"],
                "audio_filesize": audio_result["filesize"],
                "audio_duration": audio_result["duration_estimate"],
                "questions": questions
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/evaluate-writing', methods=['POST'])
def evaluate_writing():
    """评估写作作文"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求体不能为空"}), 400
        
        # 验证请求数据
        try:
            eval_request = WritingEvaluationRequest(**data)
        except ValidationError as e:
            return jsonify({"error": f"请求数据验证失败: {str(e)}"}), 400
        
        # 构建批改提示词
        prompt = f"""你是一名严格但友好的 IELTS Academic Writing 考官，熟悉 IELTS 官方评分标准（Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy）。

你的任务是：
1️⃣ 在已知写作题目的前提下，评估考生作文是否准确回应题目；
2️⃣ 按四个评分维度分别给出 0.5 为单位的分数；
3️⃣ 明确指出每个维度的主要问题（具体到句子或表达层面）；
4️⃣ 给出可操作的修改建议，而不是泛泛而谈；
5️⃣ 不得凭空添加题目要求，也不得脱离题目内容评价。

写作题目信息：
- 任务类型: {eval_request.task_type}
- 题目: {eval_request.task_title}
- 描述: {eval_request.task_description}
- 要求: {eval_request.task_requirements}
- 难度: {eval_request.difficulty}

考生作文：
{eval_request.user_essay}

请按照以下JSON格式返回评估结果：
{{
  "overall_score": 6.5,  // 总分（0-9，0.5为间隔）
  "task_response": {{
    "score": 6.5,  // 任务回应分数
    "strengths": ["具体优势1", "具体优势2"],
    "weaknesses": ["具体问题1", "具体问题2"],
    "suggestions": ["具体建议1", "具体建议2"]
  }},
  "coherence_cohesion": {{
    "score": 7.0,
    "strengths": ["具体优势1", "具体优势2"],
    "weaknesses": ["具体问题1", "具体问题2"],
    "suggestions": ["具体建议1", "具体建议2"]
  }},
  "lexical_resource": {{
    "score": 6.0,
    "strengths": ["具体优势1", "具体优势2"],
    "weaknesses": ["具体问题1", "具体问题2"],
    "suggestions": ["具体建议1", "具体建议2"]
  }},
  "grammatical_range_accuracy": {{
    "score": 6.5,
    "strengths": ["具体优势1", "具体优势2"],
    "weaknesses": ["具体问题1", "具体问题2"],
    "suggestions": ["具体建议1", "具体建议2"]
  }},
  "overall_feedback": "总体反馈，包括主要优点和需要改进的地方",
  "word_count": {len(eval_request.user_essay.split())},  // 单词数
  "character_count": {len(eval_request.user_essay)}  // 字符数
}}

请确保：
1. 分数以0.5为间隔（如6.0, 6.5, 7.0等）
2. 优势和问题要具体，引用作文中的具体句子或表达
3. 建议要可操作，不要泛泛而谈
4. 总体反馈要全面且有建设性"""
        
        # 调用AI模型进行批改
        print(f"开始批改写作，任务ID: {eval_request.task_id}, 类型: {eval_request.task_type}")
        print(f"提示词长度: {len(prompt)} 字符")
        
        ai_response = call_qwen_api(prompt)
        
        if not ai_response:
            # 如果AI调用失败，返回模拟数据
            print("AI调用失败，返回模拟批改数据")
            return jsonify({
                "task_id": eval_request.task_id,
                "task_type": eval_request.task_type,
                "overall_score": 6.5,
                "task_response": {
                    "score": 6.5,
                    "strengths": ["较好地回应了题目要求", "观点明确"],
                    "weaknesses": ["部分论点缺乏充分支持", "结论不够有力"],
                    "suggestions": ["增加具体例子支持论点", "加强结论部分的论述"]
                },
                "coherence_cohesion": {
                    "score": 7.0,
                    "strengths": ["段落结构清晰", "使用了适当的连接词"],
                    "weaknesses": ["部分段落过渡不够自然", "结尾段与开头呼应不足"],
                    "suggestions": ["使用更多过渡性短语", "加强段落间的逻辑连接"]
                },
                "lexical_resource": {
                    "score": 6.0,
                    "strengths": ["使用了一些学术词汇", "词汇选择基本恰当"],
                    "weaknesses": ["词汇重复较多", "缺乏高级词汇"],
                    "suggestions": ["使用同义词替换重复词汇", "学习更多学术词汇"]
                },
                "grammatical_range_accuracy": {
                    "score": 6.5,
                    "strengths": ["基本语法正确", "使用了多种句型"],
                    "weaknesses": ["存在一些语法错误", "复杂句型使用不够准确"],
                    "suggestions": ["检查主谓一致问题", "练习使用复杂句型"]
                },
                "overall_feedback": "这是一篇不错的作文，基本回应了题目要求。主要优点在于结构清晰，观点明确。需要改进的地方包括：增加具体例子支持论点，丰富词汇表达，提高语法准确性。建议多练习议论文写作，积累学术词汇。",
                "word_count": len(eval_request.user_essay.split()),
                "character_count": len(eval_request.user_essay),
                "is_mock_data": True
            })
        
        # 尝试解析AI响应
        try:
            import json as json_module
            evaluation_result = json_module.loads(ai_response)
            
            # 添加额外信息
            evaluation_result["task_id"] = eval_request.task_id
            evaluation_result["task_type"] = eval_request.task_type
            evaluation_result["is_mock_data"] = False
            
            return jsonify(evaluation_result)
            
        except Exception as parse_error:
            print(f"解析AI响应失败: {str(parse_error)}")
            print(f"AI响应内容: {ai_response[:500]}...")
            
            # 返回错误信息
            return jsonify({
                "error": "解析AI响应失败",
                "ai_response_preview": ai_response[:500] if ai_response else "None",
                "task_id": eval_request.task_id,
                "is_mock_data": True
            }), 500
            
    except Exception as e:
        print(f"写作批改过程中发生错误: {str(e)}")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
