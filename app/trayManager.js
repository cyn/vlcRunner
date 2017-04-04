const { Tray } = require('electron');
const path = require('path');

let trayInstance;

let create = () => {
    return trayInstance = new Tray(path.join(__dirname, 'icons/VLC.png'));
};

let init = (mainWindow, addToStreamList) => {
    trayInstance.on('click', () => mainWindow[mainWindow.isVisible() ? 'hide' : 'show']());
    trayInstance.on('drag-enter', (e, data) => !mainWindow.isVisible() && mainWindow.show());
    trayInstance.on('drop-files', (e, files) => files.forEach(filePath => addToStreamList(filePath)));

    mainWindow.webContents.on('will-navigate', (e, url) => {
        addToStreamList(url);

        e.preventDefault();
    });

};

module.exports = {
    create,
    init
};
