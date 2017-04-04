const HOST_PORT = {
    host: 'localhost',
    port: 4545
};

const StreamItem = require('./StreamItem');

const { ipcMain, app, BrowserWindow, Tray, Menu } = require('electron');
app.dock.hide();

const path = require('path');
const http = require('http');
const url = require('url');
const mime = require('mime');
const pump = require('pump');
const rangeParser = require('range-parser');
const express = require('express');
const bodyParser = require('body-parser');
const parseTorrent = require('parse-torrent').remote;
const mainWindowParams = { width: 600, height: 400 };

let streamList = new Map();

const tryToAddStream = pathToTorrent => parseTorrent(pathToTorrent, (err, parsedTorrent) => {
    if (!err) {
        let { infoHash } = parsedTorrent;

        streamList.set(infoHash, new StreamItem(parsedTorrent, true, HOST_PORT));
    }
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;

function createMainWindow() {
    let trayBounds = tray.getBounds();

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: mainWindowParams.width,
        height: mainWindowParams.height,
        x: trayBounds.x - mainWindowParams.width + trayBounds.width,
        y: trayBounds.y,
        fullscreenable: false,
        minimizable: false,
        maximizable: false,
        movable: false,
        alwaysOnTop: true,
        frame: false
    });

    if (process.env.LOAD_UI_FROM_DEV_SERVER) {
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'ui', 'build', 'index.html'),
            protocol: 'file:',
        }));
    }

}

function start() {
    // mainWindow.webContents.send('update-info', { info });

    let { host, port } = HOST_PORT,
        expressApp = express();

    expressApp.use(bodyParser.json());
    expressApp.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    /* START ручки для расширения */
    expressApp.get('/ping', (req, res) => res.status(200).end());
    expressApp.post('/start', (req, res) => {
        tryToAddStream(req.body.url);

        res.send('ok');
    });
    /* END ручки для расширения */

    // Запрос плейлиста от VLC
    expressApp
        .get('/stream/:infoHash/playlist.m3u', (req, res, next) => {
            if (streamList.has(req.params.infoHash)) {
                next();
            } else {
                res.status(404).end();
            }
        })
        .get('/stream/:infoHash/playlist.m3u', (req, res) => {
            let playlist = streamList.get(req.params.infoHash).getPlaylist();

            res.set({
                'Content-Type': 'application/x-mpegurl; charset=utf-8',
                'Content-Length': Buffer.byteLength(playlist)
            });

            res.end(playlist);
        });

    // Запрос потока от VLC
    expressApp
        .all('/stream/:infoHash', (req, res, next) => {
            if (streamList.has(req.params.infoHash)) {
                next();
            } else {
                res.status(404).end();
            }
        })
        .all('/stream/:infoHash', (req, res) => {
            let range = req.headers.range,
                file = streamList.get(req.params.infoHash).getFile(req.query.fileIndex);

            range = range && rangeParser(file.length, range)[0];

            req.connection.setTimeout(3600000);

            res.set({
                'Accept-Ranges': 'bytes',
                'Content-Type': mime.lookup.bind(mime)(file.name),
                'transferMode.dlna.org': 'Streaming',
                'contentFeatures.dlna.org':
                    'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000'
            });

            if (range) {
                res.status(206).set({
                    'Content-Length': range.end - range.start + 1,
                    'Content-Range': `bytes ${range.start}-${range.end}/${file.length}`
                });
            } else {
                res.set('Content-Length', file.length);
            }

            if (req.method === 'HEAD') {
                return res.end();
            }

            pump(file.createReadStream(range), res);
        });

    expressApp.listen(port, host);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    start();

    tray = new Tray(path.join(__dirname, 'icons/VLC.png'));

    createMainWindow();

    let timerId,
        webContents = mainWindow.webContents,
        updateInfo = info => webContents.send('update-info', info);

    mainWindow.on('show', e => {
        timerId = setInterval(() => {
            let accInfo = [];

            streamList.forEach(streamItem => accInfo.push(streamItem.getInfo()));

            updateInfo(accInfo.reverse());
        }, 500);
    });
    mainWindow.on('hide', () => clearInterval(timerId));
    mainWindow.on('blur', () => mainWindow.hide());

    ipcMain.on('play', (e, data) => streamList.get(data.infoHash).startVlc());
    ipcMain.on('remove', (e, data) => streamList.get(data.infoHash).destroy()
        .then(() => streamList.delete(data.infoHash)));

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    tray.on('drag-enter', (e, data) => {
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
    });

    tray.on('drop-files', (e, files) => {
        files.forEach(filePath => tryToAddStream(filePath));
    });

    webContents.on('will-navigate', (e, url) => {
        tryToAddStream(url);
        e.preventDefault();
    });
});
