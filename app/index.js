const PORT = 4545;
const HOST = 'localhost';

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
const mainWindowParams = {
    width: 600,
    height: 400
};

const StreamList = require('./StreamList');

const tryToAddStream = pathToTorrent => parseTorrent(pathToTorrent, (err, parsedTorrent) => {
    if (!err) {
        streamList.addItem(parsedTorrent);
    }
});


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;
let streamList;

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
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'ui', 'build', 'index.html'),
            protocol: 'file:',
        }));
    }

}

function start() {
    streamList = new StreamList({
        host: HOST,
        port: PORT
    });

    // mainWindow.webContents.send('update-info', { info });

    let expressApp = express();

    expressApp.use(bodyParser.json());

    /* START ручки для расширения */
    expressApp.get('/ping', (req, res) => res.status(200).end());
    expressApp.post('/start', (req, res) => {
        tryToAddStream(req.body.url);

        res.send('ok');
    });
    /* END ручки для расширения */

    expressApp
        .all('/stream/*', (req, res, next) => {
            // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
            // by responding to the OPTIONS preflight request with the specified
            // origin and requested headers.
            if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
                res.set({
                    'Access-Control-Allow-Origin': req.headers.origin,
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'],
                    'Access-Control-Max-Age': '1728000'
                });

                res.end();
            } else {
                next();
            }
        })
        .all('/stream/*', (req, res, next) => {
            if (req.headers.origin) {
                res.set('Access-Control-Allow-Origin', req.headers.origin);
            }

            next();
        });

    // Запрос плейлиста от VLC
    expressApp
        .get('/stream/:infoHash/playlist.m3u', (req, res, next) => {
            if (streamList.hasStreamExist(req.params.infoHash)) {
                next();
            } else {
                res.status(404).end();
            }
        })
        .get('/stream/:infoHash/playlist.m3u', (req, res) => {
            let playlist = streamList.getPlaylist(req.params.infoHash);

            res.set({
                'Content-Type': 'application/x-mpegurl; charset=utf-8',
                'Content-Length': Buffer.byteLength(playlist)
            });

            res.end(playlist);
        });

    // Запрос потока от VLC
    expressApp
        .all('/stream/:infoHash', (req, res, next) => {
            if (streamList.hasStreamExist(req.params.infoHash)) {
                next();
            } else {
                res.status(404).end();
            }
        })
        .all('/stream/:infoHash', (req, res) => {
            let range = req.headers.range,
                file = streamList.getFileFromStream({
                    infoHash: req.params.infoHash,
                    fileIndex: req.query.fileIndex
                });

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

    expressApp.listen(PORT, () => console.log(`Start at ${PORT}`));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    start();

    tray = new Tray(path.join(__dirname, 'icons/vlc.png'));

    createMainWindow();

    let timerId,
        webContents = mainWindow.webContents,
        updateInfo = info => webContents.send('update-info', info);

    mainWindow.on('show', e => {
        timerId = setInterval(() => updateInfo(streamList.getInfo()), 500);
    });
    mainWindow.on('hide', () => clearInterval(timerId));
    mainWindow.on('blur', () => mainWindow.hide());

    ipcMain.on('play', (e, data) => streamList.play(data.infoHash));
    ipcMain.on('remove', (e, data) => streamList.remove(data.infoHash));

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
