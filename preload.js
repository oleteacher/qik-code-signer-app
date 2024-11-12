const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => {
        if (['select-file', 'sign-file', 'select-signtool'].includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel, func) => {
        if (['file-selected', 'sign-result', 'signtool-selected'].includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});