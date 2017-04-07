const { Menu, shell, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const { name, version } = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));

let trayInstance;

module.exports = {

    create: () => trayInstance = new Tray(path.join(__dirname, 'icons/vlc.png')),

    init: (mainWindow, addToStreamList) => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: `${name} v${version}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: 'О программе',
                click() {
                    shell.openExternal(`https://github.com/cyn/vlcRunner/blob/master/README.md`);
                }

            },
            {
                label: 'Расширение для Google Chrome',
                click() {
                    shell.openExternal('http://localhost:4545/chrome.crx');
                }
            },
            {
                label: 'Закрыть',
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
