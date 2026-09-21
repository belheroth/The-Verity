const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { initLocalDb, localDbAPI } = require('./local-db.cjs');

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
    : path.join(__dirname, 'dist-server', 'server-bundle.cjs');
  const dataDir = app.isPackaged
    ? app.getPath('userData')
    : path.join(__dirname, '..', 'server');

  if (app.isPackaged) seedDatabase(dataDir);

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, DATA_DIR: dataDir, NODE_ENV: 'production', IS_ADMIN_APP: 'true' },
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
