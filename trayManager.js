const { app, Menu, shell, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json'));

let trayInstance;

module.exports = {

    create: () => trayInstance = new Tray(path.join(__dirname, 'icons/vlc.png')),

    init: (mainWindow, addToStreamList) => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: `${packageJson.name}@${packageJson.version}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: 'Справка',
                click() {
                    shell.openExternal('https://github.com/cyn/vlcRunner');
                }
            },
            {
                label: 'Расширение для Google Chrome',
                click() {
                    shell.openExternal('http://localhost:4545/chrome.crx');
                }
            },
            {
                label: 'Выход',
                accelerator: 'Cmd+Q',
                role: 'quit'
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
