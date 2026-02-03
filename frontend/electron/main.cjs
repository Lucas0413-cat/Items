const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对窗口对象的全局引用
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  const preloadPath = app.isPackaged
    ? path.join(app.getAppPath(), 'electron/preload.cjs')
    : path.join(__dirname, 'preload.cjs');
    
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,  // 禁用nodeIntegration以提高安全性
      contextIsolation: true,  // 必须为true才能使用contextBridge
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  // 加载应用
  if (app.isPackaged) {
    // 打包后的路径
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // 开发模式下的路径 - 尝试多个端口
    const ports = [3000, 3001, 3002];
    let loaded = false;
    
    for (const port of ports) {
      try {
        mainWindow.loadURL(`http://localhost:${port}`);
        loaded = true;
        break;
      } catch (error) {
        console.log(`Failed to load port ${port}:`, error);
      }
    }
    
    if (!loaded) {
      console.error('Failed to load application on any port');
      dialog.showErrorBox('错误', '无法加载应用，请确保Vite开发服务器正在运行');
    }
  }

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 窗口关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时触发
app.on('ready', createWindow);

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 当点击dock图标且没有其他窗口打开时触发
app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理.env文件读取请求
ipcMain.handle('read-env', async (event, filePath) => {
  try {
    const envPath = path.join(app.getAppPath(), filePath || '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      return { success: true, content };
    } else {
      return { success: false, error: 'File not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 处理.env文件写入请求
ipcMain.handle('write-env', async (event, { filePath, content }) => {
  try {
    const envPath = path.join(app.getAppPath(), filePath || '.env');
    fs.writeFileSync(envPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
