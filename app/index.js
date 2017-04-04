const { ipcMain, app } = require('electron');
const parseTorrent = require('parse-torrent').remote;

const StreamItem = require('./StreamItem');
const windowManager = require('./windowManager');
const expressApp = require('./expressApp');
const trayManager = require('./trayManager');

const PORT = 4545;

app.on('ready', () => {
    let streamList = new Map(),
        addToStreamList = (torrent) => {
            parseTorrent(torrent, (err, parsedTorrent) => {
                err || streamList.set(parsedTorrent.infoHash, new StreamItem(parsedTorrent, true, PORT));
            });
        },
        tray = trayManager.create(),
        mainWindow = windowManager.create(tray),
        timerId,
        updateUi = () => {
            let accInfo = [];

            streamList.forEach(streamItem => accInfo.push(streamItem.getInfo()));

            mainWindow.webContents.send('update-info', accInfo.reverse());
        };

    expressApp(streamList, addToStreamList, PORT);
    trayManager.init(mainWindow, addToStreamList);

    mainWindow.on('show', () => {
        updateUi();
        timerId = setInterval(updateUi, 500);
    });
    mainWindow.on('hide', () => clearInterval(timerId));

    ipcMain.on('play', (e, { infoHash }) => {
        if (streamList.has(infoHash)) {
            streamList.get(infoHash).startVlc();
        }
    });

    ipcMain.on('remove', (e, { infoHash }) => {
        if (streamList.has(infoHash)) {
            streamList.get(infoHash).destroy().then(() => streamList.delete(infoHash))
        }
    });
});


