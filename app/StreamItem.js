const _ = require('lodash');
const torrentStream = require('torrent-stream');
const EventEmitter = require('events');
const url = require('url');
const path = require('path');

class StreamItem extends EventEmitter {

    constructor(parsedTorrent, player) {
        super();

        this._infoHash = parsedTorrent.infoHash;
        this._torrentName = parsedTorrent.name;
        this._engine = torrentStream(parsedTorrent);
        this._player = player;
        this._files = [];

        this._engine.on('ready', () => this._onEngineReady());
    }

    _onEngineReady() {
        let files = this._files = this._engine.files;

        this.play();
    }

    play() {
        this._player.play({
            infoHash: this._infoHash,
            autoPlay: true,
            onExit: () => console.log('exit')
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
            downloadedPercentage: Math.round(downloaded / totalLength * 100),
            downloadSpeed: parseInt(swarm.downloadSpeed(), 10),
            uploadSpeed: parseInt(swarm.uploadSpeed(), 10),
            totalPeers: wires.length,
            activePeers: wires.filter(wire => !wire.peerChoking).length
        };
    }

    getPlaylist({ host, port }) {
        let entries = this._files.map((file, fileIndex) => {
            let fileName = file.name,
                href = StreamItem.getFileUrl({
                    host,
                    port,
                    fileIndex,
                    infoHash: this._infoHash
                });

            return `#EXTINF:-1,${fileName}\n${href}`;
        }, this);

        return ['#EXTM3U'].concat(entries).join('\n');
    }

    _getTotalLength() {
        return this._totalLength ||
            (this._totalLength = this._files.reduce((prevFileLength, currFile) => prevFileLength + currFile.length, 0));
    }

    destroy() {
        return Promise.all([
            this._player.close(this._infoHash),
            new Promise(resolve => this._engine.destroy(() => {
                resolve();
            }))
        ]);
    }

    static getFileUrl({ host, port, infoHash, fileIndex }) {
        return url.format({
            protocol: 'http',
            hostname: host,
            port,
            pathname: path.join('stream', infoHash),
            query: { fileIndex }
        });
    }

    static getPlaylistUrl({ host, port, infoHash }) {
        return url.format({
            protocol: 'http',
            hostname: host,
            port,
            pathname: path.join('stream', infoHash, 'playlist.m3u')
        });
    }

}

module.exports = StreamItem;
