"""
文本转语音(TTS)服务模块
为雅思听力练习生成音频文件
"""

import os
import base64
import tempfile
from gtts import gTTS
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TTSService:
    """文本转语音服务类"""
    
    def __init__(self, language='en', slow=False):
        """
        初始化TTS服务
        
        Args:
            language: 语言代码，默认'en'（英语）
            slow: 是否慢速播放，默认False
        """
        self.language = language
        self.slow = slow
        self.temp_dir = tempfile.gettempdir()
        
    def text_to_speech(self, text, filename=None):
        """
        将文本转换为语音并保存为MP3文件
        
        Args:
            text: 要转换的文本
            filename: 输出文件名（可选）
            
        Returns:
            dict: 包含文件路径和base64编码的音频数据
        """
        try:
            if not text or not text.strip():
                logger.warning("文本为空，无法生成音频")
                return None
                
            # 清理文本，移除多余空格和换行
            cleaned_text = ' '.join(text.split())
            
            # 创建gTTS对象
            tts = gTTS(text=cleaned_text, lang=self.language, slow=self.slow)
            
            # 生成临时文件名
            if not filename:
                import uuid
                filename = f"ielts_listening_{uuid.uuid4().hex[:8]}.mp3"
            
            filepath = os.path.join(self.temp_dir, filename)
            
            # 保存音频文件
            tts.save(filepath)
            logger.info(f"音频文件已保存: {filepath}")
            
            # 读取文件并转换为base64
            with open(filepath, 'rb') as audio_file:
                audio_bytes = audio_file.read()
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            # 获取文件大小
            file_size = os.path.getsize(filepath)
            
            return {
                'filepath': filepath,
                'filename': filename,
                'filesize': file_size,
                'audio_base64': audio_base64,
                'text': cleaned_text,
                'language': self.language,
                'duration_estimate': self._estimate_duration(len(cleaned_text))
            }
            
        except Exception as e:
            logger.error(f"文本转语音失败: {e}")
            return None
    
    def text_to_base64(self, text):
        """
        将文本转换为base64编码的音频数据
        
        Args:
            text: 要转换的文本
            
        Returns:
            str: base64编码的音频数据
        """
        result = self.text_to_speech(text)
        if result:
            return result['audio_base64']
        return None
    
    def generate_listening_dialogue(self, scenario="university", participants=2):
        """
        生成雅思听力对话场景
        
        Args:
            scenario: 场景类型（university, library, accommodation, travel等）
            participants: 参与者数量
            
        Returns:
            dict: 对话文本和元数据
        """
        # 场景映射 - 支持更多关键词
        scenarios = {
            "university": {
                "title": "University Conversation",
                "context": "Two students discussing their studies at a university",
                "participants": ["Student A", "Student B"],
                "keywords": ["university", "college", "campus", "study", "education"]
            },
            "library": {
                "title": "Library Discussion",
                "context": "A student asking a librarian for help finding resources",
                "participants": ["Student", "Librarian"],
                "keywords": ["library", "book", "research", "reading", "resource"]
            },
            "accommodation": {
                "title": "Accommodation Inquiry",
                "context": "A student inquiring about accommodation options",
                "participants": ["Student", "Accommodation Officer"],
                "keywords": ["accommodation", "housing", "rent", "apartment", "dormitory"]
            },
            "travel": {
                "title": "Travel Arrangements",
                "context": "Planning a trip or discussing travel experiences",
                "participants": ["Traveler A", "Traveler B"],
                "keywords": ["travel", "trip", "vacation", "journey", "tour"]
            },
            "bank": {
                "title": "Bank Transaction",
                "context": "A customer discussing banking services with a bank teller",
                "participants": ["Customer", "Bank Teller"],
                "keywords": ["bank", "money", "account", "transaction", "finance"]
            },
            "restaurant": {
                "title": "Restaurant Reservation",
                "context": "Making a reservation or ordering food at a restaurant",
                "participants": ["Customer", "Waiter"],
                "keywords": ["restaurant", "food", "meal", "dining", "reservation"]
            },
            "shopping": {
                "title": "Shopping Experience",
                "context": "Shopping for clothes or other items at a store",
                "participants": ["Customer", "Shop Assistant"],
                "keywords": ["shopping", "store", "buy", "purchase", "clothes"]
            },
            "hospital": {
                "title": "Hospital Visit",
                "context": "A patient visiting a doctor or hospital",
                "participants": ["Patient", "Doctor"],
                "keywords": ["hospital", "doctor", "health", "medical", "clinic"]
            },
            "job_interview": {
                "title": "Job Interview",
                "context": "A candidate attending a job interview",
                "participants": ["Interviewer", "Candidate"],
                "keywords": ["job", "interview", "employment", "career", "work"]
            },
            "transportation": {
                "title": "Transportation Inquiry",
                "context": "Asking about public transportation or directions",
                "participants": ["Traveler", "Information Officer"],
                "keywords": ["transportation", "bus", "train", "taxi", "direction"]
            }
        }
        
        # 获取场景配置
        scene_config = scenarios.get(scenario, scenarios["university"])
        
        # 生成对话文本模板
        dialogue_template = self._create_dialogue_template(scene_config, participants)
        
        return {
            "scenario": scenario,
            "title": scene_config["title"],
            "context": scene_config["context"],
            "participants": scene_config["participants"][:participants],
            "dialogue_text": dialogue_template,
            "suggested_questions": self._generate_suggested_questions(scenario)
        }
    
    def _create_dialogue_template(self, scene_config, participants):
        """创建对话模板"""
        if scene_config["title"] == "University Conversation":
            return """Student A: Hi, have you finished the assignment for Professor Johnson's class?
Student B: Not yet, I'm still working on it. The deadline is this Friday, right?
Student A: Actually, it's been extended to next Monday. Professor Johnson announced it in class yesterday.
Student B: That's great news! I was worried I wouldn't have enough time. What's your topic?
Student A: I'm writing about the impact of social media on academic performance. How about you?
Student B: I'm focusing on online learning platforms and their effectiveness. Do you want to meet tomorrow to discuss our drafts?
Student A: Sure, how about 2 PM at the library?
Student B: Perfect, see you then!"""
        
        elif scene_config["title"] == "Library Discussion":
            return """Student: Excuse me, I'm looking for books on environmental science.
Librarian: Of course. We have several sections. Are you looking for something specific?
Student: Yes, I need materials about climate change and renewable energy.
Librarian: Those would be in section 500-599. Let me show you. We have recent publications on solar energy and wind power.
Student: Do you have any e-books available?
Librarian: Yes, you can access them through our online portal. I can help you set up an account if you need.
Student: That would be very helpful, thank you."""
        
        elif scene_config["title"] == "Bank Transaction":
            return """Customer: Good morning, I'd like to open a new savings account.
Bank Teller: Certainly. Do you have your identification documents with you?
Customer: Yes, I have my passport and driver's license.
Bank Teller: Perfect. We have two types of savings accounts: regular and premium. The premium account offers higher interest rates but requires a minimum balance.
Customer: I think the regular account would be suitable for me. What's the minimum deposit?
Bank Teller: There's no minimum deposit for the regular account. You can start with any amount.
Customer: That's great. I'd like to deposit $500 today."""
        
        elif scene_config["title"] == "Restaurant Reservation":
            return """Customer: Hello, I'd like to make a reservation for dinner tonight.
Waiter: Of course. For how many people and what time?
Customer: There will be four of us, around 7 PM.
Waiter: Let me check... Yes, we have a table available at 7 PM. Would you prefer indoor or outdoor seating?
Customer: Indoor seating, please. Do you have any vegetarian options?
Waiter: Yes, we have a separate vegetarian menu with several delicious options.
Customer: Perfect. Please book the table under the name Smith."""
        
        elif scene_config["title"] == "Shopping Experience":
            return """Customer: Excuse me, I'm looking for a winter coat.
Shop Assistant: Certainly. We have a variety of coats in different styles and colors. What size are you looking for?
Customer: I usually wear medium. I prefer something in blue or black.
Shop Assistant: Let me show you our new collection. This blue coat is waterproof and very warm. It's currently on sale.
Customer: Can I try it on?
Shop Assistant: Of course, the fitting room is right over there. Let me know if you need a different size."""
        
        elif scene_config["title"] == "Hospital Visit":
            return """Patient: Good morning, I have an appointment with Dr. Johnson at 10 AM.
Receptionist: Yes, I see your appointment. Please fill out this form while you wait.
Patient: Thank you. Is Dr. Johnson running on schedule today?
Receptionist: He's running about 15 minutes behind. Would you like some water while you wait?
Patient: No, thank you. I'll just complete the form.
Doctor: Hello, I'm Dr. Johnson. How can I help you today?"""
        
        elif scene_config["title"] == "Job Interview":
            return """Interviewer: Good morning, thank you for coming in today. Please have a seat.
Candidate: Thank you for the opportunity.
Interviewer: Let's start by telling me about your previous work experience.
Candidate: I've worked as a marketing assistant for two years, where I managed social media campaigns and organized events.
Interviewer: That's interesting. Why are you interested in this position at our company?
Candidate: I'm impressed by your company's innovative approach and I believe my skills would be a good fit."""
        
        elif scene_config["title"] == "Transportation Inquiry":
            return """Traveler: Excuse me, could you tell me how to get to the city center?
Information Officer: Certainly. You can take bus number 10 from this stop. It goes directly to the city center.
Traveler: How often does the bus come?
Information Officer: Every 15 minutes during peak hours. The next bus should arrive in about 5 minutes.
Traveler: Do I need exact change for the fare?
Information Officer: No, you can use a contactless card or buy a ticket from the machine over there."""
        
        else:
            # 通用对话模板
            participants_list = scene_config["participants"][:participants]
            dialogue_lines = []
            for i in range(5):  # 生成5轮对话
                speaker = participants_list[i % len(participants_list)]
                line = f"{speaker}: This is line {i+1} of the dialogue about {scene_config['context'].lower()}."
                dialogue_lines.append(line)
            
            return "\n".join(dialogue_lines)
    
    def _generate_suggested_questions(self, scenario):
        """生成建议的问题"""
        question_templates = {
            "university": [
                {"type": "multiple_choice", "question": "What are the students discussing?", "options": ["Their assignments", "A party", "Sports event", "Job interview"], "answer": "Their assignments"},
                {"type": "fill_blank", "question": "The deadline has been extended to ______.", "answer": "next Monday"},
                {"type": "true_false_not_given", "question": "Both students have finished their assignments.", "answer": "False"}
            ],
            "library": [
                {"type": "multiple_choice", "question": "What is the student looking for?", "options": ["Environmental science books", "Fiction novels", "History books", "Magazines"], "answer": "Environmental science books"},
                {"type": "fill_blank", "question": "The books about climate change are in section ______.", "answer": "500-599"},
                {"type": "true_false_not_given", "question": "The library doesn't have e-books available.", "answer": "False"}
            ],
            "bank": [
                {"type": "multiple_choice", "question": "What is the customer discussing with the bank teller?", "options": ["Opening a new account", "Applying for a loan", "Reporting a lost card", "Checking balance"], "answer": "Opening a new account"},
                {"type": "fill_blank", "question": "The customer needs to provide two forms of ______.", "answer": "identification"},
                {"type": "true_false_not_given", "question": "The bank is closed on weekends.", "answer": "Not Given"}
            ],
            "restaurant": [
                {"type": "multiple_choice", "question": "What is the customer doing?", "options": ["Making a reservation", "Complaining about food", "Asking for the menu", "Paying the bill"], "answer": "Making a reservation"},
                {"type": "fill_blank", "question": "The reservation is for ______ people.", "answer": "four"},
                {"type": "true_false_not_given", "question": "The restaurant only serves vegetarian food.", "answer": "False"}
            ],
            "shopping": [
                {"type": "multiple_choice", "question": "What is the customer looking for?", "options": ["A winter coat", "Running shoes", "Formal dress", "Casual shirt"], "answer": "A winter coat"},
                {"type": "fill_blank", "question": "The customer prefers the ______ color.", "answer": "blue"},
                {"type": "true_false_not_given", "question": "The store offers free alterations.", "answer": "True"}
            ]
        }
        
        return question_templates.get(scenario, question_templates["university"])
    
    def get_scenario_by_keyword(self, keyword):
        """
        根据关键词获取最匹配的场景
        
        Args:
            keyword: 用户输入的关键词
            
        Returns:
            str: 场景名称
        """
        keyword_lower = keyword.lower().strip()
        
        # 场景映射（在generate_listening_dialogue方法中定义）
        scenarios = {
            "university": ["university", "college", "campus", "study", "education", "student", "class", "lecture"],
            "library": ["library", "book", "research", "reading", "resource", "reference", "catalog"],
            "accommodation": ["accommodation", "housing", "rent", "apartment", "dormitory", "room", "lease"],
            "travel": ["travel", "trip", "vacation", "journey", "tour", "flight", "hotel"],
            "bank": ["bank", "money", "account", "transaction", "finance", "cash", "withdrawal", "deposit"],
            "restaurant": ["restaurant", "food", "meal", "dining", "reservation", "menu", "order", "table"],
            "shopping": ["shopping", "store", "buy", "purchase", "clothes", "shop", "mall", "market"],
            "hospital": ["hospital", "doctor", "health", "medical", "clinic", "patient", "appointment", "medicine"],
            "job_interview": ["job", "interview", "employment", "career", "work", "position", "application", "resume"],
            "transportation": ["transportation", "bus", "train", "taxi", "direction", "station", "ticket", "schedule"]
        }
        
        # 精确匹配
        for scenario, keywords in scenarios.items():
            if keyword_lower in keywords:
                return scenario
        
        # 模糊匹配（包含关系）
        for scenario, keywords in scenarios.items():
            for kw in keywords:
                if keyword_lower in kw or kw in keyword_lower:
                    return scenario
        
        # 默认返回大学场景
        return "university"
    
    def _estimate_duration(self, text_length):
        """估计音频时长（基于文本长度）"""
        # 平均阅读速度：150词/分钟
        words = text_length / 5  # 粗略估计：5个字符一个词
        duration_minutes = words / 150
        return round(duration_minutes * 60, 2)  # 转换为秒
    
    def cleanup_temp_files(self, pattern="ielts_listening_*.mp3"):
        """清理临时音频文件"""
        import glob
        files = glob.glob(os.path.join(self.temp_dir, pattern))
        for file in files:
            try:
                os.remove(file)
                logger.info(f"已删除临时文件: {file}")
            except Exception as e:
                logger.warning(f"删除文件失败 {file}: {e}")
        return len(files)


# 全局TTS服务实例
tts_service = TTSService()

if __name__ == "__main__":
    # 测试TTS服务
    test_text = "This is a test of the text to speech service for IELTS listening practice."
    result = tts_service.text_to_speech(test_text)
    
    if result:
        print(f"音频生成成功!")
        print(f"文件: {result['filename']}")
        print(f"大小: {result['filesize']} bytes")
        print(f"时长估计: {result['duration_estimate']} 秒")
        print(f"Base64长度: {len(result['audio_base64'])} 字符")
        
        # 测试对话生成
        dialogue = tts_service.generate_listening_dialogue("university", 2)
        print(f"\n生成的对话:")
        print(f"场景: {dialogue['scenario']}")
        print(f"标题: {dialogue['title']}")
        print(f"对话文本:\n{dialogue['dialogue_text'][:200]}...")
    else:
        print("音频生成失败")