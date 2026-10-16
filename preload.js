const { contextBridge, ipcRenderer } = require('electron');
const inv = (c) => (a) => ipcRenderer.invoke(c, a);
contextBridge.exposeInMainWorld('api', {
  state: inv('state'), display: inv('display'), toggle: inv('toggle'), profiles: inv('profiles'),
  settings: inv('settings'), crosshair: inv('crosshair'), opt: inv('opt'), profile: inv('profile'), running: inv('running'), auth: inv('auth'), rust: inv('rust'), modules: inv('modules'), copy: inv('copy'), open: inv('open'),
  win: (a) => ipcRenderer.send('win', a),
  onState: (cb) => ipcRenderer.on('state', (_, s) => cb(s)),
});
