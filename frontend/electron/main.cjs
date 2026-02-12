const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');

// 保持对窗口对象的全局引用
let mainWindow;
let backendProcess = null;
let backendPort = 5000;

// 复制后端文件到用户数据目录
async function copyBackendFiles() {
  try {
    console.log('Checking backend files...');
    
    // 用户数据目录中的后端路径
    const userDataPath = app.getPath('userData');
    const targetBackendPath = path.join(userDataPath, 'backend');
    
    // 检查目标目录是否已存在
    if (fs.existsSync(targetBackendPath)) {
      console.log('Backend files already exist in user data directory');
      return targetBackendPath;
    }
    
    console.log('Backend files not found, copying from resources...');
    
    // 创建目标目录
    fs.mkdirSync(targetBackendPath, { recursive: true });
    
    // 源路径 - 尝试多个可能的位置
    let sourceBackendPath = null;
    
    // 1. 首先尝试resources/backend目录（根据extraFiles配置）
    const resourcesBackendPath = path.join(process.resourcesPath, 'backend');
    if (fs.existsSync(resourcesBackendPath)) {
      sourceBackendPath = resourcesBackendPath;
      console.log('Found backend files in resources/backend directory');
    }
    // 2. 尝试app.asar.unpacked目录
    else if (fs.existsSync(path.join(process.resourcesPath, 'app.asar.unpacked', 'backend'))) {
      sourceBackendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
      console.log('Found backend files in app.asar.unpacked');
    }
    // 3. 尝试开发目录
    else if (fs.existsSync(path.join(__dirname, '../../backend'))) {
      sourceBackendPath = path.join(__dirname, '../../backend');
      console.log('Found backend files in development directory');
    }
    
    if (!sourceBackendPath) {
      console.error('Could not find backend files in any location');
      return null;
    }
    
    // 复制文件
    const filesToCopy = [
      'app.py',
      'tts_service.py',
      'requirements.txt',
      '.env.example'
    ];
    
    for (const file of filesToCopy) {
      const sourceFile = path.join(sourceBackendPath, file);
      const targetFile = path.join(targetBackendPath, file);
      
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`Copied ${file} to user data directory`);
      } else {
        console.warn(`Source file not found: ${file}`);
      }
    }
    
    // 创建.env文件（如果不存在）
    const envFile = path.join(targetBackendPath, '.env');
    if (!fs.existsSync(envFile)) {
      const envExample = path.join(targetBackendPath, '.env.example');
      if (fs.existsSync(envExample)) {
        fs.copyFileSync(envExample, envFile);
        console.log('Created .env file from .env.example');
      } else {
        // 创建基本的.env文件
        fs.writeFileSync(envFile, 'API_KEY=your_api_key_here\n');
        console.log('Created basic .env file');
      }
    }
    
    console.log('Backend files copied successfully');
    return targetBackendPath;
    
  } catch (error) {
    console.error('Error copying backend files:', error);
    return null;
  }
}

// 检查端口是否被占用
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(true);
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// 杀死占用端口的进程
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
              const pid = parts[parts.length - 1];
              try {
                process.kill(parseInt(pid), 'SIGKILL');
                console.log(`Killed process ${pid} on port ${port}`);
              } catch (e) {
                // 进程可能已经结束
              }
            }
          });
        }
        resolve();
      });
    } else {
      // macOS/Linux
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, resolve);
    }
  });
}

// 启动后端服务
async function startBackendService() {
  try {
    // 先检查端口是否被占用
    const portInUse = await isPortInUse(backendPort);
    if (portInUse) {
      console.log(`Port ${backendPort} is in use, attempting to kill existing process...`);
      await killProcessOnPort(backendPort);
      // 等待一下让端口释放
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 获取后端路径
    let backendPath;
    if (app.isPackaged) {
      // 打包版本：复制后端文件到用户数据目录并使用
      backendPath = await copyBackendFiles();
      if (!backendPath) {
        console.error('Failed to copy backend files');
        return false;
      }
    } else {
      // 开发版本：使用项目目录中的后端文件
      backendPath = path.join(__dirname, '../../backend');
    }
    
    const pythonScript = path.join(backendPath, 'app.py');
    
    if (!fs.existsSync(pythonScript)) {
      console.error('Backend Python script not found:', pythonScript);
      return false;
    }

    console.log('Starting backend service from:', backendPath);
    
    // 启动Python后端
    backendProcess = spawn('python', [pythonScript], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });

    // 记录输出
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend stdout: ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend stderr: ${data.toString().trim()}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend process:', err);
      backendProcess = null;
    });

    // 等待后端启动
    console.log('Waiting for backend to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    console.error('Error starting backend service:', error);
    return false;
  }
}

// 停止后端服务
function stopBackendService() {
  return new Promise((resolve) => {
    if (backendProcess) {
      console.log('Stopping backend service...');
      backendProcess.kill('SIGTERM');
      
      // 给进程一点时间正常关闭
      setTimeout(() => {
        if (backendProcess) {
          backendProcess.kill('SIGKILL');
        }
        backendProcess = null;
        console.log('Backend service stopped');
        resolve();
      }, 2000);
    } else {
      resolve();
    }
  });
}

// 清理所有端口
async function cleanupPorts() {
  console.log('Cleaning up ports...');
  
  // 清理后端端口
  await killProcessOnPort(backendPort);
  
  // 清理可能的前端开发服务器端口
  await killProcessOnPort(3000);
  await killProcessOnPort(3001);
  await killProcessOnPort(3002);
  
  console.log('Port cleanup completed');
}

async function createWindow() {
  try {
    // 如果是打包版本，启动后端服务
    if (app.isPackaged) {
      console.log('App is packaged, starting backend service...');
      const backendStarted = await startBackendService();
      if (!backendStarted) {
        dialog.showErrorBox('启动失败', '无法启动后端服务，请检查Python环境');
        app.quit();
        return;
      }
    }

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
      // 打包后的路径 - 使用本地后端
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

  } catch (error) {
    console.error('Error creating window:', error);
    dialog.showErrorBox('启动错误', `创建窗口时发生错误: ${error.message}`);
    app.quit();
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时触发
app.on('ready', () => {
  createWindow().catch(error => {
    console.error('Failed to create window:', error);
    dialog.showErrorBox('启动失败', `无法创建应用窗口: ${error.message}`);
    app.quit();
  });
});

// 应用即将退出时的清理
app.on('before-quit', async (event) => {
  console.log('App is quitting, cleaning up...');
  
  // 阻止默认退出行为，先执行清理
  event.preventDefault();
  
  try {
    // 停止后端服务
    await stopBackendService();
    
    // 清理端口
    await cleanupPorts();
    
    console.log('Cleanup completed, quitting app...');
    
    // 延迟一点确保清理完成
    setTimeout(() => {
      app.exit(0);
    }, 500);
  } catch (error) {
    console.error('Error during cleanup:', error);
    app.exit(1);
  }
});

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
