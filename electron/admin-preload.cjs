const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isAdminApp: true,
  closeApp: () => ipcRenderer.send('close-app'),
  enableLockdown: () => {},
  disableLockdown: () => {},
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Client-side SQLite local storage
  localDB: {
    saveDraft: (assignmentId, studentId, code, history) => 
      ipcRenderer.invoke('local-db:saveDraft', assignmentId, studentId, code, history),
    getDraft: (assignmentId, studentId) => 
      ipcRenderer.invoke('local-db:getDraft', assignmentId, studentId),
    cacheClassrooms: (classrooms) => 
      ipcRenderer.invoke('local-db:cacheClassrooms', classrooms),
    getCachedClassrooms: () => 
      ipcRenderer.invoke('local-db:getCachedClassrooms'),
    cacheClasswork: (classroomId, classwork) => 
      ipcRenderer.invoke('local-db:cacheClasswork', classroomId, classwork),
    getCachedClasswork: (classroomId) => 
      ipcRenderer.invoke('local-db:getCachedClasswork', classroomId),
    addToSyncQueue: (action, url, method, body) => 
      ipcRenderer.invoke('local-db:addToSyncQueue', action, url, method, body),
    getSyncQueue: () => 
      ipcRenderer.invoke('local-db:getSyncQueue'),
    removeFromSyncQueue: (id) => 
      ipcRenderer.invoke('local-db:removeFromSyncQueue', id),
    setLocal: (key, value) => 
      ipcRenderer.invoke('local-db:setLocal', key, value),
    getLocal: (key) => 
      ipcRenderer.invoke('local-db:getLocal', key)
  }
});
