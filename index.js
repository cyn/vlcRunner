const { ipcMain, app } = require('electron');
const parseTorrent = require('parse-torrent').remote;

const StreamItem = require('./StreamItem');
const windowManager = require('./windowManager');
const expressApp = require('./expressApp');
const trayManager = require('./trayManager');
const stateStorage = require('./stateStorage');

const PORT = 4545;

app.on('ready', () => {
    let state = stateStorage.load(),
        streamList = new Map(),
        addToStreamList = (torrent, autoPlay = true) => {
            parseTorrent(torrent, (err, parsedTorrent) => {
                if (!err) {
                    let { infoHash } = parsedTorrent;

                    streamList.set(infoHash, new StreamItem({
                        parsedTorrent,
                        state: state.streams.get(infoHash),
                        autoPlay,
                        port: PORT
                    }));

                    state.torrents.has(infoHash) || state.torrents.set(infoHash, torrent);
                }
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

    state.torrents.forEach((torrent) => addToStreamList(torrent, false));

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
            streamList.get(infoHash).destroy().then(() => {
                streamList.delete(infoHash);
                state.torrents.delete(infoHash);
                state.streams.delete(infoHash);
            });
        }
    });

    ipcMain.on('refresh', (e, { infoHash }) => {
        if (state.torrents.has(infoHash)) {
            addToStreamList(state.torrents.get(infoHash), false)
        }
    });

    app.on('before-quit', () => {
        streamList.forEach(streamItem => {
            if (streamItem.state) {
                state.streams.set(streamItem.infoHash, streamItem.state);
            }
        });

        stateStorage.save(state);
    })
});


