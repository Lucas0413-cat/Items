import React, { useState, useEffect } from 'react';
import './App.css';
import Reading from './components/Reading';
import Listening from './components/Listening';
import Writing from './components/Writing';
import ConfigManager from './components/ConfigManager';
import { healthCheck } from './services/api';

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [apiStatus, setApiStatus] = useState('checking');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // 检查API状态
    const checkApiStatus = async () => {
      try {
        await healthCheck();
        setApiStatus('healthy');
      } catch (error) {
        setApiStatus('unhealthy');
      }
    };
    checkApiStatus();
  }, []);

  // 检查是否在Electron环境中
  const isElectron = window.electronAPI !== undefined;

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
        </div>
      </header>
      <main className="main">
        {activeSection === 'home' && (
          <div className="home">
            <h2>欢迎使用雅思模拟考试系统</h2>
            <p>本系统使用Qwen-max模型生成模拟试题，包括阅读、听力和写作三个板块。</p>
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
                </span>
              </p>
              <p>使用模型：Qwen-max</p>
              <p>支持板块：阅读、听力、写作</p>
            </div>
          </div>
        )}
        {activeSection === 'reading' && <Reading />}
        {activeSection === 'listening' && <Listening />}
        {activeSection === 'writing' && <Writing />}
        {showConfig && <ConfigManager />}
      </main>
      <footer className="footer">
        <p>© 2024 雅思模拟考试系统</p>
      </footer>
    </div>
  );
}

export default App;