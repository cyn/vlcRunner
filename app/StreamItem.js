const _ = require('lodash');
const torrentStream = require('torrent-stream');
const EventEmitter = require('events');
const url = require('url');
const path = require('path');
const VLC = require('./VLC.js');

class StreamItem extends EventEmitter {

    constructor(parsedTorrent, autoPlay, hostPort) {
        super();

        this._hostPort = hostPort;

        this._infoHash = parsedTorrent.infoHash;
        this._torrentName = parsedTorrent.name || parsedTorrent.infoHash;
        this._engine = torrentStream(parsedTorrent);
        this._files = [];

        this._piecesCount = (parsedTorrent.pieces || []).length;
        this._verifiedPiecesCount = 0;

        this._engine.on('ready', () => this._onEngineReady());
        this._engine.on('verify', () => this._onVerifyPiece());

        if (autoPlay) {
            this._engine.on('ready', () => this.startVlc());
        }
    }

    _onEngineReady() {
        let { files, torrent } = this._engine,
            { name, pieces } = torrent;

        this._files = files;
        this._torrentName = name;
        this._piecesCount = pieces.length;
    }

    _onVerifyPiece() {
        this._verifiedPiecesCount += 1;
    }

    startVlc() {
        VLC(/*{ onExit: () => console.log('exit') }*/).then(vlcInfo => this._onVlcInit(vlcInfo));
    }

    _onVlcInit({ vlc, kill }) {
        let playlistUrl = this._getUrl({ partPath: 'playlist.m3u' });

        this._vlc = vlc;
        this._vlcKill = kill;

        vlc.play(playlistUrl).then(() => {
            vlc.on('change:position', (oldVal, newVal) => {
                console.log(oldVal, newVal);
            });
            vlc.on('change:playlist', (oldVal, newVal) => {
                console.log(newVal);
            });
        });
    }

    getFile(index) {
        return this._files[index];
    }

    getInfo() {
        let { swarm } = this._engine;
        let { downloaded, uploaded, wires } = swarm;
        let totalLength = this._getTotalLength();

        return {
            hash: this._infoHash,
            name: this._torrentName,
            files: this._files.map(file => _.pick(file, ['name', 'length'])),
            downloaded,
            uploaded,
            totalLength,
            downloadedPercentage: Math.round(this._verifiedPiecesCount / this._piecesCount * 100),
            downloadSpeed: parseInt(swarm.downloadSpeed(), 10),
            uploadSpeed: parseInt(swarm.uploadSpeed(), 10),
            totalPeers: wires.length,
            activePeers: wires.filter(wire => !wire.peerChoking).length
        };
    }

    getPlaylist() {
        let entries = this._files.map((file, fileIndex) => {
            let href = this._getUrl({
                query: { fileIndex }
            });

            return `#EXTINF:-1,${file.name}\n${href}`;
        }, this);

        return ['#EXTM3U'].concat(entries).join('\n');
    }

    _getTotalLength() {
        return this._totalLength ||
            (this._totalLength = this._files.reduce((prevFileLength, currFile) => prevFileLength + currFile.length, 0));
    }

    _getUrl({ partPath, query }) {
        let { host, port } = this._hostPort;

        return url.format({
            protocol: 'http',
            hostname: host,
            port,
            pathname: path.join.apply(path, ['stream', this._infoHash].concat(partPath || [])),
            query: query
        })
    }

    destroy() {
        return Promise.all([
            this._vlcKill(),
            new Promise(resolve => this._engine.remove(resolve)),
            new Promise(resolve => this._engine.destroy(resolve)),
        ]);
    }

}

module.exports = StreamItem;
