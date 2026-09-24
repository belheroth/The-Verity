const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, session, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork, spawn } = require('child_process');
const { initLocalDb, localDbAPI } = require('./local-db.cjs');

const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_USER_AGENT;

let mainWindow;
let splashWindow = null;
let serverProcess = null;
let hudProcess = null; // native keyboard-hook helper
let lockdownActive = false;

// The native helper blocks the Windows key while this file exists. The file's
// TEMPORARY presence (not absence) is the "locked" signal, so any stray file
// left on a crash automatically keeps lockdown ON until the app is closed —
// which is the safe failure mode for an exam proctor.
let lockFilePath = null;

function startKeyboardHook() {
  if (!app.isPackaged) return; // dev mode: don't hijack the developer's keyboard
  const exePath = path.join(process.resourcesPath, 'native', 'KioskLockHook.exe');
  lockFilePath = path.join(app.getPath('userData'), '.verity-lock');
  if (!fs.existsSync(exePath)) {
    console.error('[main] KioskLockHook.exe not found at', exePath);
    return;
  }
  setLockedFile(false); // make sure a fresh launch starts unlocked
  hudProcess = spawn(exePath, [lockFilePath], { detached: true });
  hudProcess.on('error', (err) => console.error('[main] hook error:', err));
  hudProcess.unref(); // don't keep the app alive for it
  console.log('[main] Keyboard hook started');
}

function setLockedFile(locked) {
  if (!lockFilePath) return;
  try {
    if (locked) {
      fs.writeFileSync(lockFilePath, String(Date.now()));
      console.log('[main] Lock file CREATED:', lockFilePath);
    } else if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
      console.log('[main] Lock file DELETED:', lockFilePath);
    }
  } catch (err) {
    console.error('[main] Could not toggle lock file:', err.message);
  }
}

function killKeyboardHook() {
  if (hudProcess && hudProcess.exitCode === null) {
    try { hudProcess.kill(); } catch (_) {}
  }
  // Clear the lock file so the next launch starts unilocked.
  setLockedFile(false);
}

function seedDatabase(dataDir) {
  // Merge seed users into the runtime database so that the built-in accounts
  // (admin@verity.com / admin, etc.) are always present alongside any accounts
  // the user created in earlier runs.
  const dbPath = path.join(dataDir, 'database.json');
  const seedPath = app.isPackaged
    ? path.join(process.resourcesPath, 'database.json')
    : path.join(__dirname, '..', 'server', 'database.json');

  let current = { users: [], classwork: {}, classrooms: [], securityFlags: {} };
  if (fs.existsSync(dbPath)) {
    try { current = JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch { /* corrupt */ }
  }
  let seedData = { users: [] };
  try { seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')); } catch {}

  const existingEmails = new Set((current.users || []).map((u) => u.email));
  let added = 0;
  for (const u of (seedData.users || [])) {
    if (!existingEmails.has(u.email)) {
      current.users.push(u);
      added++;
    }
  }

  if (added > 0) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(current, null, 2));
      console.log(`[main] Seeded ${added} accounts into:`, dbPath);
    } catch (err) {
      console.error('[main] Could not seed database:', err.message);
    }
  }
}

function startServer() {
  // The server is bundled by esbuild into a single CJS file with all requires
  // inlined, so it needs no node_modules at runtime. We fork it from
  // extraResources (outside ASAR) and pass DATA_DIR so database.json and
  // uploads/ land in a writable location.
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
    env: { ...process.env, ...parsedEnv, DATA_DIR: dataDir, NODE_ENV: 'production' },
    silent: true,
  });
  serverProcess.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  serverProcess.on('exit', (code) => {
    console.log(`[server] exited with code ${code}`);
    serverProcess = null;
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// Shortcuts we swallow while a student is locked in.
const LOCKED_SHORTCUTS = [
  'Alt+Tab',
  'Alt+F4',
  'Alt+Escape',
  'Alt+Space',
  'Super',            // Windows key
  'Super+Tab',        // Task View
  'Meta+Tab',         // Task View (alternate key name)
  'Super+D',          // Show Desktop
  'Super+M',          // Minimize all
  'Super+E',          // File Explorer
  'Super+L',          // Lock screen
  'Super+R',          // Run dialog
  'Super+S',          // Search
  'Super+A',          // Action center
  'Super+I',          // Settings
  'Super+X',          // Quick link menu
  'Super+V',          // Windows Clipboard History
  'Meta+V',           // Windows Clipboard History alternate
  'Super+Alt+V',
  'CommandOrControl+Super+V',
  'CommandOrControl+W',
  'CommandOrControl+Shift+W',
  'CommandOrControl+Tab',
  'CommandOrControl+Alt+Delete',
  'F11',
  'F12',
  'CommandOrControl+Shift+I',
  'CommandOrControl+Shift+J',
  'CommandOrControl+Shift+C',
  'CommandOrControl+U',
  'CommandOrControl+R',
  'CommandOrControl+Shift+R',
  'F5',
];

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
    width: 1200,
    height: 800,
    show: false, // Initially hidden while splash screen is active
    icon: path.join(__dirname, 'assets', 'icon.png'),
    kiosk: false, // start unlocked — only students get locked down (after login)
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  // Explicitly remove the menu bar (File, Edit, View, Window) from the window
  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  // If DevTools is opened, immediately close it in production or when student lockdown is active
  mainWindow.webContents.on('devtools-opened', () => {
    if (app.isPackaged || lockdownActive) {
      mainWindow.webContents.closeDevTools();
    }
  });

  // Block DevTools shortcuts and reload keys
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isDevToolsShortcut =
      input.key === 'F12' ||
      ((input.control || input.meta) && input.shift && ['I', 'i', 'J', 'j', 'C', 'c'].includes(input.key)) ||
      ((input.control || input.meta) && ['u', 'U'].includes(input.key));

    if (isDevToolsShortcut && (app.isPackaged || lockdownActive)) {
      event.preventDefault();
      return;
    }

    if (lockdownActive) {
      const isReloadShortcut =
        input.key === 'F5' ||
        ((input.control || input.meta) && ['r', 'R'].includes(input.key));
      if (isReloadShortcut) {
        event.preventDefault();
        return;
      }

      const isClipboardHistory =
        (input.meta || input.super) && ['v', 'V'].includes(input.key);
      if (isClipboardHistory) {
        event.preventDefault();
        return;
      }
    }
  });

  // Restrict child window creation and external link navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Google OAuth and auth popup dialogs inside an Electron child window so OAuth postMessage works
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

    // Open other external links safely in OS default browser rather than an uncontrolled Electron window
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      // Prevent redirecting the main app window to external sites
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        if (!app.isPackaged && parsedUrl.host === 'localhost:5173') {
          return; // Allow Vite dev server in local development
        }
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (_) {}
  });

  if (app.isPackaged) {
    // Production: load the Vite build output via intercepted http.
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Development: load the live Vite dev server.
    mainWindow.loadURL('http://localhost:5173');
  }

  // Smoothly transition from splash window to main window
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
    const remainingDelay = Math.max(0, 2200 - elapsed);
    setTimeout(launchMainWindow, remainingDelay);
  });

  // Safety fallback in case ready-to-show takes too long
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      launchMainWindow();
    }
  }, 4500);

  // If a locked-down student somehow loses then regains focus, re-assert kiosk.
  mainWindow.on('focus', () => {
    if (lockdownActive) mainWindow.setKiosk(true);
  });

  // Alt+Tab can't be reliably blocked on Windows, so instead we yank focus
  // straight back the moment the window loses it while locked down. The short
  // delay lets our OWN child windows (dialogs, menus) take focus first — if one
  // of them is focused we leave it alone so its buttons stay clickable.
  mainWindow.on('blur', () => {
    if (!lockdownActive) return;
    setTimeout(() => {
      if (!lockdownActive) return;
      if (BrowserWindow.getFocusedWindow()) return; // a window of ours has focus
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }, 120);
  });

  // Don't let a locked-down student minimize out of the way.
  mainWindow.on('minimize', (e) => {
    if (lockdownActive) {
      e.preventDefault();
      mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Block close while locked down (Alt+F4 etc.).
  mainWindow.on('close', (e) => {
    if (lockdownActive) e.preventDefault();
  });
}

function enableLockdown(options = {}) {
  if (!mainWindow) return;
  lockdownActive = true;

  // Immediately close developer options if open
  try {
    if (mainWindow.webContents && mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    }
  } catch (_) {}

  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.focus();

  if (options.disableWindowsKeyAltTab !== false) {
    // Engage the native keyboard hook & global shortcut swallowing
    setLockedFile(true);
    for (const accel of LOCKED_SHORTCUTS) {
      try {
        globalShortcut.register(accel, () => {}); // swallow
      } catch (_) {
        // some accelerators aren't registrable on every platform; ignore
      }
    }
  } else {
    // Keep window kiosk mode active but release global shortcut hook
    setLockedFile(false);
    globalShortcut.unregisterAll();
  }
}

function disableLockdown() {
  lockdownActive = false;
  globalShortcut.unregisterAll();
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setKiosk(false);
  }
  // Release the native keyboard hook.
  setLockedFile(false);
}

app.whenReady().then(() => {
  // Completely remove default application menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

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
    // Intercept http://localhost:5173 to serve local files in production
    // This allows Google OAuth to see a valid web origin instead of file://
    protocol.handle('http', (request) => {
      const url = new URL(request.url);
      if (url.hostname === 'localhost' && url.port === '5173') {
        let reqPath = url.pathname;
        if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
        
        let file = path.join(__dirname, '../dist', reqPath);
        // Fallback to index.html for React Router
        if (!fs.existsSync(file)) {
          file = path.join(__dirname, '../dist/index.html');
        }
        
        return net.fetch('file://' + file);
      }
      return net.fetch(request, { bypassCustomProtocolHandlers: true });
    });
  }

  createSplashWindow();

  try {
    initLocalDb(app.getPath('userData'));
  } catch (e) {
    console.error('[main] initLocalDb error:', e);
  }

  if (app.isPackaged) {
    // Production: start backend server + native hook, window will reveal after splash
    startServer();
    startKeyboardHook();
    createWindow();
  } else {
    // Development: server already running via dev
    createWindow();
  }
});

// --- IPC from the renderer (React) ---
ipcMain.on('enable-lockdown', (event, options) => {
  console.log('[main] enable-lockdown received with options:', options);
  enableLockdown(options);
});
ipcMain.on('disable-lockdown', () => {
  console.log('[main] disable-lockdown received');
  disableLockdown();
});

ipcMain.handle('get-display-count', () => {
  const { screen } = require('electron');
  return screen.getAllDisplays().length;
});

ipcMain.on('close-app', () => {
  disableLockdown(); // make sure the close handler lets us quit
  app.quit();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// Local SQLite storage IPC handlers
ipcMain.handle('local-db:saveDraft', (_, assignmentId, studentId, code, history) => 
  localDbAPI.saveDraft(assignmentId, studentId, code, history));
ipcMain.handle('local-db:getDraft', (_, assignmentId, studentId) => 
  localDbAPI.getDraft(assignmentId, studentId));
ipcMain.handle('local-db:cacheClassrooms', (_, classrooms) => 
  localDbAPI.cacheClassrooms(classrooms));
ipcMain.handle('local-db:getCachedClassrooms', () => 
  localDbAPI.getCachedClassrooms());
ipcMain.handle('local-db:cacheClasswork', (_, classroomId, classwork) => 
  localDbAPI.cacheClasswork(classroomId, classwork));
ipcMain.handle('local-db:getCachedClasswork', (_, classroomId) => 
  localDbAPI.getCachedClasswork(classroomId));
ipcMain.handle('local-db:addToSyncQueue', (_, action, url, method, body) => 
  localDbAPI.addToSyncQueue(action, url, method, body));
ipcMain.handle('local-db:getSyncQueue', () => 
  localDbAPI.getSyncQueue());
ipcMain.handle('local-db:removeFromSyncQueue', (_, id) => 
  localDbAPI.removeFromSyncQueue(id));
ipcMain.handle('local-db:setLocal', (_, key, value) => 
  localDbAPI.setLocal(key, value));
ipcMain.handle('local-db:getLocal', (_, key) => 
  localDbAPI.getLocal(key));

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopServer();
  killKeyboardHook();
});

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});
