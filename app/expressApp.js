const express = require('express');
const rangeParser = require('range-parser');
const bodyParser = require('body-parser');
const pump = require('pump');
const mime = require('mime');

module.exports = (streamList, addToStreamList, port) => {
    let expressApp = express();

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
        addToStreamList(req.body.url);

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
                file = streamList.get(req.params.infoHash).getFile(req.query.index);

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

    expressApp.listen(port);

    return expressApp;
};
