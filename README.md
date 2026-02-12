# 雅思模拟考试系统 (IELTS Practice System)

一个基于AI的雅思考试模拟桌面应用程序，使用Qwen-max模型生成阅读、听力和写作题目。

## 项目特点

- 🎯 **全真模拟**：提供雅思阅读、听力、写作三个板块的模拟练习
- 🤖 **AI驱动**：集成Qwen-max大语言模型动态生成高质量题目
- 🖥️ **桌面应用**：使用Electron打包，支持Windows、macOS、Linux
- 🔧 **配置灵活**：支持.env文件配置API密钥和模型参数
- 📱 **响应式设计**：适配不同屏幕尺寸，提供良好的用户体验

## 技术架构

### 前端
- **框架**：React 18 + Vite
- **UI**：CSS模块化样式
- **桌面端**：Electron 21.4.0
- **HTTP客户端**：Axios

### 后端
- **框架**：Flask (Python)
- **API设计**：RESTful API
- **数据验证**：Pydantic
- **跨域支持**：Flask-CORS

### AI集成
- **模型**：Qwen-max大语言模型
- **API**：支持阿里云DashScope API
- **回退机制**：API不可用时使用模拟数据

## 快速开始

### 环境要求
- Node.js 16+
- Python 3.7+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/ielts-practice.git
   cd ielts-practice
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **安装前端依赖**
   ```bash
   cd frontend
   npm install
   ```

4. **配置环境变量**
   - 复制 `backend/.env.example` 为 `backend/.env`
   - 在 `.env` 中配置Qwen API密钥（可选）

### 运行应用

#### 开发模式
1. **启动后端服务**
   ```bash
   cd backend
   python app.py
   ```

2. **启动前端开发服务器**
   ```bash
   cd frontend
   npm run dev
   ```

3. 在浏览器中打开 http://localhost:3000

#### 桌面应用模式
1. **构建桌面应用**
   ```bash
   cd frontend
   npm run electron:build
   ```

2. **运行应用**
   - Windows: `frontend/dist-electron/win-unpacked/雅思模拟考试.exe`
   - 安装包: `frontend/dist-electron/雅思模拟考试 Setup 0.0.0.exe`

## API接口

### 健康检查
```
GET /api/health
```
返回API运行状态

### 生成题目
```
POST /api/generate-questions
```
请求体：
```json
{
  "section": "reading|listening|writing",
  "difficulty": "easy|medium|hard",
  "count": 1
}
```

### 获取考试板块
```
GET /api/sections
```

### 获取难度级别
```
GET /api/difficulties
```

## 项目结构

```
ielts-practice/
├── backend/                 # Python后端
│   ├── app.py              # Flask主应用
│   ├── requirements.txt    # Python依赖
│   └── .env.example        # 环境变量示例
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── Reading.jsx # 阅读模块
│   │   │   ├── Listening.jsx # 听力模块
│   │   │   ├── Writing.jsx # 写作模块
│   │   │   └── ConfigManager.jsx # 配置管理
│   │   ├── services/       # API服务
│   │   └── App.jsx         # 主应用组件
│   ├── electron/           # Electron配置
│   ├── vite.config.js      # Vite配置
│   └── package.json        # 前端依赖
├── README.md               # 项目说明
└── .gitignore              # Git忽略文件
```

## 配置说明

### Qwen API配置
在 `backend/.env` 文件中配置：
```
QWEN_API_KEY=your_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 应用配置
- 后端端口：5000
- 前端开发端口：3000
- Electron窗口尺寸：1200x800

## 开发说明

### 常见问题解决

#### 1. Electron打包错误
如果出现"require is not defined"错误：
- 确保使用`.cjs`扩展名用于CommonJS模块
- 检查`contextIsolation`和`nodeIntegration`配置

#### 2. API连接失败
如果显示"API异常"：
- 确保后端服务正在运行
- 检查Electron安全配置（`webSecurity: false`）
- 确认API路径配置正确

#### 3. 空白页面问题
如果应用打开后显示空白：
- 检查Vite配置中的`base`路径
- 确认资源文件正确加载

### 构建命令
```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# Electron开发
npm run electron:dev

# Electron打包
npm run electron:build
```

## 版本信息

### v1.0.2 (AI优化版)
- **API配置修复**：修复Qwen API URL配置，使用正确的DashScope端点
- **AI响应解析**：新增结构化JSON解析功能，自动提取文章、题目和答案
- **题目生成优化**：改进prompt模板，确保AI返回可解析的题目数据
- **答题界面增强**：添加答案提交、自动评分和答案反馈功能
- **答案自动识别**：用户答案与正确答案自动比对并保存结果
- **测试脚本**：新增AI生成功能测试脚本，验证系统正常工作
- **样式优化**：添加答案反馈、评分显示和题目状态样式

### v1.0.1 (功能增强版)
- **关键词输入功能**：阅读部分支持关键词输入，可根据特定主题生成题目
- **答题记录系统**：自动保存生成的题目和用户答题记录
- **历史记录查看**：新增历史记录页面，可查看题目、答题和练习会话
- **统计功能**：显示正确率、难度分布、关键词热度等统计数据
- **数据管理**：支持数据导出/导入，便于备份和迁移
- **UI优化**：改进控制面板布局，添加标签页导航

### v0.0.0 (初始版本)
- 基础功能：阅读、听力、写作模拟
- AI题目生成集成
- Electron桌面应用打包
- 环境配置管理

## 许可证

本项目采用MIT许可证。详见LICENSE文件。

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目Issues：https://github.com/Lucas0413-cat/ielts-practice/issues
- 邮箱：yelu04130305@gmail.com

---

**注意**：本项目为教育用途，生成的题目仅供参考，实际考试请以官方材料为准。
