import React, { useState, useEffect } from 'react';
import './App.css';
import Reading from './components/Reading';
import Listening from './components/Listening';
import Writing from './components/Writing';
import History from './components/History';
import ConfigManager from './components/ConfigManager';
import { createApiInstance } from './services/config';

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [apiStatus, setApiStatus] = useState('checking');
  const [showConfig, setShowConfig] = useState(false);
  const [apiInstance, setApiInstance] = useState(null);

  useEffect(() => {
    // 初始化API实例
    const initApi = async () => {
      try {
        console.log('开始初始化API实例...');
        const instance = await createApiInstance();
        setApiInstance(instance);
        console.log('API实例创建成功');
        
        // 检查API状态
        const checkApiStatus = async () => {
          try {
            console.log('开始检查API状态...');
            // 使用创建的API实例进行健康检查
            const response = await instance.get('/api/health', { timeout: 30000 });
            console.log('API健康检查成功:', response.data);
            // 根据返回结果判断状态
            setApiStatus('healthy');
            console.log('设置API状态为健康');
          } catch (error) {
            console.error('健康检查失败，使用离线模式:', error.message);
            setApiStatus('offline');
            console.log('设置API状态为离线');
          }
        };
        
        checkApiStatus();
      } catch (error) {
        console.error('初始化API实例失败:', error.message);
        setApiStatus('offline');
        console.log('设置API状态为离线');
      }
    };
    
    initApi();
  }, []); // 空依赖数组确保只在组件挂载时执行一次

  // 检查是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

  return (
    <div className="app">
      <header className="header">
        <h1>雅思模拟考试</h1>
        <nav>
          <ul>
            <li onClick={() => setActiveSection('home')}>首页</li>
            <li onClick={() => setActiveSection('reading')}>阅读</li>
            <li onClick={() => setActiveSection('listening')}>听力</li>
            <li onClick={() => setActiveSection('writing')}>写作</li>
            <li onClick={() => setActiveSection('history')}>历史记录</li>
            {isElectron && (
              <li onClick={() => setShowConfig(!showConfig)}>
                {showConfig ? '关闭配置' : '配置管理'}
              </li>
            )}
          </ul>
        </nav>
        <div className={`api-status ${apiStatus}`}>
          {apiStatus === 'checking' && '检查API状态...'}
          {apiStatus === 'healthy' && 'API正常'}
          {apiStatus === 'unhealthy' && 'API异常'}
          {apiStatus === 'offline' && '离线模式'}
        </div>
      </header>
      <main className="main">
        {activeSection === 'home' && (
          <div className="home">
            <h2>欢迎使用雅思模拟考试系统</h2>
            <p>本系统使用Qwen-max模型生成模拟试题，包括阅读、听力和写作三个板块。</p>
            {apiStatus === 'offline' && (
              <div className="offline-notice">
                <p><strong>注意：当前处于离线模式</strong></p>
                <p>系统正在使用模拟数据运行，您可以测试界面功能。要使用完整的AI生成功能，请确保后端服务正在运行。</p>
              </div>
            )}
            <div className="section-buttons">
              <button onClick={() => setActiveSection('reading')}>开始阅读练习</button>
              <button onClick={() => setActiveSection('listening')}>开始听力练习</button>
              <button onClick={() => setActiveSection('writing')}>开始写作练习</button>
            </div>
            <div className="system-info">
              <h3>系统信息</h3>
              <p>运行环境：{isElectron ? '桌面客户端' : '网页浏览器'}</p>
              <p>API状态：
                <span className={`status-badge ${apiStatus}`}>
                  {apiStatus === 'checking' && '检查中'}
                  {apiStatus === 'healthy' && '正常'}
                  {apiStatus === 'unhealthy' && '异常'}
                  {apiStatus === 'offline' && '离线模式'}
                </span>
              </p>
              <p>使用模型：{apiStatus === 'offline' ? '模拟数据' : 'Qwen-max'}</p>
              <p>支持板块：阅读、听力、写作</p>
            </div>
          </div>
        )}
        {activeSection === 'reading' && <Reading />}
        {activeSection === 'listening' && <Listening />}
        {activeSection === 'writing' && <Writing />}
        {activeSection === 'history' && <History />}
        {showConfig && <ConfigManager />}
      </main>
      <footer className="footer">
        <p>© 2024 雅思模拟考试系统</p>
      </footer>
    </div>
  );
}

export default App;