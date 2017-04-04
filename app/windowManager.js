const MAIN_WINDOW_PARAMS = { width: 600, height: 300 };
const { BrowserWindow, app } = require('electron');
const isDev = !!process.env.LOAD_UI_FROM_DEV_SERVER;
const devToolsHeight = 275;
const url = require('url');
const path = require('path');

// if (!isDev) {
//     app.dock.hide();
// }

module.exports = {
    create: tray => {
        let trayBounds = tray.getBounds(),
            mainWindow = new BrowserWindow({
                width: MAIN_WINDOW_PARAMS.width,
                height: MAIN_WINDOW_PARAMS.height + (isDev ? devToolsHeight : 0),
                x: trayBounds.x - MAIN_WINDOW_PARAMS.width + trayBounds.width,
                y: trayBounds.y,
                fullscreenable: false,
                minimizable: false,
                maximizable: false,
                movable: false,
                alwaysOnTop: true,
                frame: false
            });

        if (isDev) {
            mainWindow.loadURL('http://localhost:3000');
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'ui', 'build', 'index.html'),
                protocol: 'file:',
            }));
        }

        mainWindow.on('blur', () => mainWindow.hide());

        return mainWindow;
    }
};
