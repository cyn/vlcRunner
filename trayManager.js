const { app, Menu, shell, Tray } = require('electron');
const path = require('path');

let trayInstance;

module.exports = {

    create: () => trayInstance = new Tray(path.join(__dirname, 'icons/vlc.png')),

    init: (mainWindow, addToStreamList) => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Скачать расширение для Google Chrome',
                click() {
                    shell.openExternal('http://localhost:4545/chrome.crx');
                }
            },
            {
                label: 'Справка',
                click() {
                    shell.openExternal('https://github.com/cyn/vlcRunner');
                }
            },
            {
                label: 'Выход',
                click() {
                    app.quit();
                }
            }
        ]);

        trayInstance.on('click', () => mainWindow[mainWindow.isVisible() ? 'hide' : 'show']());
        trayInstance.on('drag-enter', (e, data) => !mainWindow.isVisible() && mainWindow.show());
        trayInstance.on('drop-files', (e, files) => files.forEach(filePath => addToStreamList(filePath)));
        trayInstance.on('right-click', () => contextMenu.popup(mainWindow));

        mainWindow.webContents.on('will-navigate', (e, url) => {
            addToStreamList(url);

            e.preventDefault();
        });
    }

};
