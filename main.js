const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const { exec } = require('child_process');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
		icon: path.join('assets/icon.ico'),
        webPreferences: {
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
	
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.loadFile('index.html');
    //mainWindow.webContents.openDevTools();

    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
				label: 'Documentation',
				click: () => {
					let docWindow = new BrowserWindow({
						width: 800,
						height: 700,
						parent: mainWindow,
						modal: true,
						autoHideMenuBar: true,
						menuBarVisible: false,
						icon: path.join('assets/icon.ico'),
						webPreferences: {
						contextIsolation: true,
						enableRemoteModule: false
						}
					});
					
					// Add window handler for this window specifically
					docWindow.webContents.setWindowOpenHandler(({ url }) => {
						shell.openExternal(url);
						return { action: 'deny' };
					});
					
					docWindow.loadFile('docs.html');
				}
                },
                {
				label: 'About',
				click: () => {
					let aboutWindow = new BrowserWindow({
						width: 400,
						height: 400,
						parent: mainWindow,
						modal: true,
						autoHideMenuBar: true,
						menuBarVisible: false,
						icon: path.join('assets/icon.ico'),
						minimizable: false,
						maximizable: false
					});

					// Add window handler for this window specifically
					aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
						shell.openExternal(url);
						return { action: 'deny' };
					});

					aboutWindow.loadFile('about.html');
				}
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

ipcMain.on('select-signtool', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'SignTool', extensions: ['exe'] }],
        defaultPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        event.reply('signtool-selected', result.filePaths[0]);
    }
});

ipcMain.on('select-file', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        event.reply('file-selected', result.filePaths[0]);
    }
});

ipcMain.on('sign-file', (event, { filePath, sha1Hash, signtoolPath }) => {
    // Use custom signtool path or default to the built-in one
    const finalSigntoolPath = signtoolPath || path.join(__dirname, 'tools', 'signtool.exe');
    const normalizedPath = finalSigntoolPath.replace(/\\/g, '\\\\');
    
    const cmd = `"${normalizedPath}" sign /sha1 "${sha1Hash}" /tr http://time.certum.pl /td sha256 /fd sha256 "${filePath}"`;

    console.log('Command to execute:', cmd);
    
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error('Signing Error:', stderr);
            event.reply('sign-result', `Error: ${stderr || err.message}`);
        } else {
            console.log('Signing Success:', stdout);
            event.reply('sign-result', 'File signed successfully!');
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});