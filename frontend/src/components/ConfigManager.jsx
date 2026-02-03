import React, { useState, useEffect } from 'react';

const ConfigManager = () => {
  const [envContent, setEnvContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const loadEnvFile = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.readEnv('../backend/.env');
        if (result.success) {
          setEnvContent(result.content);
        }
      } catch (error) {
        console.error('Error loading .env file:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const saveEnvFile = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.writeEnv({
          filePath: '../backend/.env',
          content: envContent
        });
        if (result.success) {
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2000);
        }
      } catch (error) {
        console.error('Error saving .env file:', error);
      }
    }
  };

  useEffect(() => {
    loadEnvFile();
  }, []);

  if (!window.electronAPI) {
    return null;
  }

  return (
    <div className="config-manager">
      <h3>API配置管理</h3>
      {isLoading ? (
        <p>加载配置中...</p>
      ) : (
        <>
          <div className="env-editor">
            <textarea
              rows={10}
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              placeholder=".env文件内容"
            />
          </div>
          <div className="config-actions">
            <button onClick={saveEnvFile}>保存配置</button>
            {isSaved && <span className="save-success">保存成功！</span>}
          </div>
          <p className="config-note">
            注意：修改配置后需要重启应用才能生效。
          </p>
        </>
      )}
    </div>
  );
};

export default ConfigManager;