const { app, BrowserWindow, ipcMain, shell, session, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { initLocalDb, localDbAPI } = require('./local-db.cjs');

const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_USER_AGENT;

let mainWindow;
let splashWindow = null;
let serverProcess = null;

function seedDatabase(dataDir) {
  const dbPath = path.join(dataDir, 'database.json');
  const seedPath = app.isPackaged
    ? path.join(process.resourcesPath, 'database.json')
    : path.join(__dirname, '..', 'server', 'database.json');

  let current = { users: [], admin_users: [], classwork: {}, classrooms: [], securityFlags: {} };
  if (fs.existsSync(dbPath)) {
    try { current = JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch { /* corrupt */ }
  }
  let seedData = { users: [], admin_users: [] };
  try { seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')); } catch {}

  let added = 0;
  if (!current.admin_users) current.admin_users = [];
  const existingAdminEmails = new Set(current.admin_users.map((u) => u.email));
  for (const u of (seedData.admin_users || [])) {
    if (!existingAdminEmails.has(u.email)) {
      current.admin_users.push(u);
      added++;
    }
  }

  if (added > 0) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(current, null, 2));
      console.log(`[admin-main] Seeded ${added} admin accounts into:`, dbPath);
    } catch (err) {
      console.error('[admin-main] Could not seed database:', err.message);
    }
  }
}

function startServer() {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'dist-server', 'server-bundle.cjs')
    : path.join(__dirname, '..', 'dist-server', 'server-bundle.cjs');
  const dataDir = app.isPackaged
    ? app.getPath('userData')
    : path.join(__dirname, '..', 'server');

  if (app.isPackaged) seedDatabase(dataDir);

  const envFile = app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '..', 'server', '.env');

  const parsedEnv = {};
  if (fs.existsSync(envFile)) {
    try {
      const raw = fs.readFileSync(envFile, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (key) parsedEnv[key] = val;
        }
      }
    } catch (_) {}
  }

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, ...parsedEnv, DATA_DIR: dataDir, NODE_ENV: 'production', IS_ADMIN_APP: 'true' },
    silent: true,
  });
  serverProcess.stdout.on('data', (d) => process.stdout.write(`[admin-server] ${d}`));
  serverProcess.stderr.on('data', (d) => process.stderr.write(`[admin-server] ${d}`));
  serverProcess.on('exit', (code) => {
    console.log(`[admin-server] exited with code ${code}`);
    serverProcess = null;
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 200,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'The Verity - Admin Control Center',
    width: 1280,
    height: 850,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'admin-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google OAuth popup window to open in Electron for seamless postMessage exchange
    if (url.includes('accounts.google.com') || url.includes('google.com/gsi/') || url.includes('oauth2.googleapis.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            userAgent: CHROME_USER_AGENT,
          }
        }
      };
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        if (!app.isPackaged && parsedUrl.host === 'localhost:5173') {
          return;
        }
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (_) {}
  });

  if (app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  const launchMainWindow = () => {
    if (!mainWindow) return;
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  };

  const splashStartTime = Date.now();
  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStartTime;
    const remainingDelay = Math.max(0, 1500 - elapsed);
    setTimeout(launchMainWindow, remainingDelay);
  });

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      launchMainWindow();
    }
  }, 4000);
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Intercept Google OAuth and Google API requests to prevent disallowed_useragent blocks
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://accounts.google.com/*', 'https://*.google.com/*', 'https://oauth2.googleapis.com/*'] },
      (details, callback) => {
        const { requestHeaders } = details;
        requestHeaders['User-Agent'] = CHROME_USER_AGENT;
        if (!requestHeaders['Origin'] || requestHeaders['Origin'] === 'file://' || requestHeaders['Origin'] === 'null') {
          requestHeaders['Origin'] = 'http://localhost:5173';
          requestHeaders['Referer'] = 'http://localhost:5173/';
        }
        callback({ requestHeaders });
      }
    );

    if (app.isPackaged) {
      protocol.handle('http', (request) => {
        const url = new URL(request.url);
        if (url.hostname === 'localhost' && url.port === '5173') {
          let reqPath = url.pathname;
          if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
          
          let file = path.join(__dirname, '../dist', reqPath);
          if (!fs.existsSync(file)) {
            file = path.join(__dirname, '../dist/index.html');
          }
          
          return net.fetch('file://' + file);
        }
        return net.fetch(request, { bypassCustomProtocolHandlers: true });
      });
    }

    const dataDir = app.isPackaged
      ? app.getPath('userData')
      : path.join(__dirname, '..', 'server');

    try {
      initLocalDb(dataDir);
    } catch (err) {
      console.error('[admin-main] Local SQLite database initialization failed:', err);
    }

    startServer();
    createSplashWindow();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// IPC Handlers
ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// IPC Handler for client-side local database
ipcMain.handle('local-db:saveDraft', (event, assignmentId, studentId, code, history) => {
  return localDbAPI.saveDraft(assignmentId, studentId, code, history);
});
ipcMain.handle('local-db:getDraft', (event, assignmentId, studentId) => {
  return localDbAPI.getDraft(assignmentId, studentId);
});
ipcMain.handle('local-db:cacheClassrooms', (event, classrooms) => {
  return localDbAPI.cacheClassrooms(classrooms);
});
ipcMain.handle('local-db:getCachedClassrooms', () => {
  return localDbAPI.getCachedClassrooms();
});
ipcMain.handle('local-db:cacheClasswork', (event, classroomId, classwork) => {
  return localDbAPI.cacheClasswork(classroomId, classwork);
});
ipcMain.handle('local-db:getCachedClasswork', (event, classroomId) => {
  return localDbAPI.getCachedClasswork(classroomId);
});
ipcMain.handle('local-db:addToSyncQueue', (event, action, url, method, body) => {
  return localDbAPI.addToSyncQueue(action, url, method, body);
});
ipcMain.handle('local-db:getSyncQueue', () => {
  return localDbAPI.getSyncQueue();
});
ipcMain.handle('local-db:removeFromSyncQueue', (event, id) => {
  return localDbAPI.removeFromSyncQueue(id);
});
ipcMain.handle('local-db:setLocal', (event, key, value) => {
  return localDbAPI.setLocal(key, value);
});
ipcMain.handle('local-db:getLocal', (event, key) => {
  return localDbAPI.getLocal(key);
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  stopServer();
});
