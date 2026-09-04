const { app, BrowserWindow, globalShortcut } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    kiosk: true, // 👈 THIS IS THE LOCKDOWN: Makes it full screen, no exit
    webPreferences: {
  preload: path.join(__dirname, 'preload.js'), // Add this
  nodeIntegration: false, // Recommended for security
  contextIsolation: true,
    }
  });

  mainWindow.loadURL('http://localhost:5173'); // Your Vite dev URL
  //blocks  
  // BLOCKING KEYBOARD SHORTCUTS
  // Prevent Alt+Tab, Windows Key, etc.
  globalShortcut.register('CommandOrControl+Alt+Delete', () => {});
  globalShortcut.register('CommandOrControl+Tab', () => {});
}

app.whenReady().then(createWindow);

// Disable closing with Alt+F4
app.on('browser-window-focus', (event, win) => {
    win.setKiosk(true);
});
const { app, BrowserWindow, ipcMain } = require('electron');

// ... (your existing createWindow function) ...

// Listen for the logout signal from React
ipcMain.on('close-app', () => {
  app.quit();
});
process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
    process.exit(1);
});