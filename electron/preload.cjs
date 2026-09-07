const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  enableLockdown: () => ipcRenderer.send('enable-lockdown'),
  disableLockdown: () => ipcRenderer.send('disable-lockdown'),
});
