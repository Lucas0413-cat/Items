const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electronAPI', {
  readEnv: (filePath) => ipcRenderer.invoke('read-env', filePath),
  writeEnv: (data) => ipcRenderer.invoke('write-env', data)
});
