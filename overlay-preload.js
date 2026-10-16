const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ov', {
  get: () => ipcRenderer.invoke('cross:get'),
  on: (cb) => ipcRenderer.on('cross', (_, c) => cb(c)),
});
