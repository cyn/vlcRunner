const http = require('http');
const peerflix = require('peerflix');
const child_process = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');
const numeral = require('numeral');
const bytes = (num) => numeral(num).format('0.0b');
const parseTorrent = url => new Promise((resolver, rejecter) => {
    require('parse-torrent').remote(url, (err, parsedTorrent) => {
        if (err) {
            rejecter(err.message);
        }

        resolver(parsedTorrent);
    });
});
const resetStats = () => {
    hotswaps = 0;
    verified = 0;
    invalid = 0;
    downloadedPercentage = 0;
    href = '';
    filename = '';
    started = new Date();
    filelength = 0;
    engine = null;
};

let app;
let engine;
let hotswaps, verified, invalid, downloadedPercentage, href, started, filename, filelength;

app = express();

app.use(bodyParser.json());

app.post('/start', (req, res) => {
    if (req.body.url) {
        parseTorrent(req.body.url).then(torrent => {
            resetStats();

            engine = peerflix(torrent, {});

            const exit = () => engine.destroy(() => {
                engine.removeAllListeners();
                resetStats();
            });

            engine.on('verify', function () {
                verified++;
                downloadedPercentage = Math.floor(verified / engine.torrent.pieces.length * 100);
            });

            engine.on('invalid-piece', function () {
                invalid++
            });

            engine.server.on('listening', () => {
                const VLC_ARGS = '-q --video-on-top --play-and-exit --http-caching=30000';
                const root = '/Applications/VLC.app/Contents/MacOS/VLC';
                const home = (process.env.HOME || '') + root;

                href = 'http://localhost:' + engine.server.address().port + '/';
                filename = engine.server.index.name.split('/').pop().replace(/\{|\}/g, '');
                filelength = engine.server.index.length;

                const cmd = `vlc ${VLC_ARGS} ${href} || ${root} ${VLC_ARGS} ${href} || ` + `${home} ${VLC_ARGS} ${href}`;

                const vlc = child_process.exec(cmd, error => error && exit());
                vlc.on('exit', exit);

                res.send('ok');
            });
        });
    }
});

app.get('/info', (req, res) => {
    let swarm = engine && engine.swarm;

    res.json({
        player: 'vlc',
        href,
        filename,
        filelength,
        downloadSpeed: swarm && bytes(swarm.downloadSpeed()),
        peers: swarm && swarm.wires.filter(wire => !wire.peerChoking).length,
        totalPeers: swarm && swarm.wires.length,
        path: engine && engine.path,
        downloaded: swarm && bytes(swarm.downloaded),
        downloadedPercentage: downloadedPercentage,
        uploaded: swarm && bytes(swarm.uploaded),
        runtime: engine && Math.floor((Date.now() - started) / 1000),
        hotswaps: hotswaps,
        verified: verified,
        invalid: invalid,
        queued: swarm && swarm.queued
    });
});

app.listen(4545, () => console.log('Start at 4545'));
