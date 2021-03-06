const { Tray } = require('electron');
const path = require('path');
const fs = require('fs');

let trayInstance;

module.exports = {

    create: () => trayInstance = new Tray(path.join(__dirname, 'icons/vlc.png')),

    init: (mainWindow, addToStreamList) => {
        trayInstance.on('click', () => mainWindow[mainWindow.isVisible() ? 'hide' : 'show']());
        trayInstance.on('drag-enter', (e, data) => !mainWindow.isVisible() && mainWindow.show());
        trayInstance.on('drop-files', (e, files) => files.forEach(filePath => addToStreamList(filePath)));

        mainWindow.webContents.on('will-navigate', (e, url) => {
            addToStreamList(url);

            e.preventDefault();
        });
    }

};
