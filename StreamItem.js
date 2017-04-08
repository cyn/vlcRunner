const torrentStream = require('torrent-stream');
const EventEmitter = require('events');
const url = require('url');
const path = require('path');
const VLC = require('./VLC.js');
const randomPort = require('random-port');
const _ = require('lodash');
const mime = require('mime');

class StreamItem extends EventEmitter {

    constructor({ parsedTorrent, state, autoPlay, port }) {
        super();

        this._port = port;

        this._infoHash = parsedTorrent.infoHash;
        this._torrentName = parsedTorrent.name || parsedTorrent.infoHash;
        this._engine = torrentStream(parsedTorrent);

        this._files = [];
        this._state = state || {};

        this._piecesCount = (parsedTorrent.pieces || []).length;
        this._verifiedPiecesCount = 0;

        this._engine.on('ready', () => this._onEngineReady());
        this._engine.on('verify', () => this._verifiedPiecesCount += 1);

        if (autoPlay) {
            this._engine.on('ready', () => this.startVlc());
        }
    }

    _onEngineReady() {
        let { files, torrent } = this._engine,
            { name, pieces } = torrent;

        this._files = files
            .filter(({ name }) => /^video\/.*/.test(mime.lookup(name)))
            .sort((a, b) => a.name.localeCompare(b.name));

        this._totalLength = this._files.reduce((res, { length }) => res += length, 0);

        this._files.forEach(file => {
            file.weight = file.length / this._totalLength;
        });

        this._torrentName = name;
        this._piecesCount = pieces.length;
    }

    startVlc() {
        this._closeVlc().then(() => {
            randomPort(port => {
                this._vlc = VLC(port);

                this._vlc.once('destruct', () => {
                    this._vlc.removeAllListeners();
                    this._vlc = null;
                });

                this._vlc.once('ready', () => this._onVlcReady());
            });
        });
    }

    _onVlcReady() {
        let playlistUri = this._getUrl({ partPath: 'playlist.m3u' }),
            onChangePlayList = (oldVal, newVal) => {
                let isPlaylistLoaded = newVal.length && _.get(newVal, '[0].uri') !== playlistUri;

                if (isPlaylistLoaded) {
                    this._vlc.removeListener('change:playlist', onChangePlayList);
                    this._onVlcPlaylistReady(newVal);
                }
            };

        this._vlc.on('change:playlist', onChangePlayList);
        this._vlc.play(playlistUri);
    }

    _closeVlc() {
        return this._vlc ?
            new Promise(resolve => {
                this._vlc.once('destruct', resolve);
                this._vlc.kill();
            }) :
            Promise.resolve();
    }

    _onVlcPlaylistReady(playlist) {
        let playlistIds = playlist.map(({ id }) => +id),
            {
                position = 0,
                fileIndex = 0
            } = this._state;

        if (position) {
            this._vlc.once('change:currentplid', () => this._vlc.seek(position));
        }

        this._vlc.goto(playlistIds[fileIndex]);

        this._vlc.on('change:position', (oldVal, newVal) =>
            this._changeState({ position: newVal }));

        this._vlc.on('change:currentplid', (oldVal, newVal) =>
            this._changeState({ fileIndex: playlistIds.indexOf(newVal) }));
    }

    _changeState({ position, fileIndex }) {
        if (!_.isUndefined(position) && position !== this._state.position) {
            this._state.position = position;
        }

        if (!_.isUndefined(fileIndex) && this._state.fileIndex !== fileIndex) {
            this._state.fileIndex = fileIndex;
        }
    }

    getFile(index) {
        return this._files[index];
    }

    getInfo() {
        let { swarm } = this._engine;

        return {
            hash: this._infoHash,
            name: this._torrentName,
            totalLength: this._totalLength,
            downloaded: this._verifiedPiecesCount / this._piecesCount,
            downloadSpeed: parseInt(swarm.downloadSpeed(), 10),
            vlcTotalPosition: this._getCurrentProgress()
        };
    }

    _getCurrentProgress() {
        let files = this._files,
            {
                fileIndex = 0,
                position = 0
            } = this._state;

        return files.slice(0, fileIndex).reduce(
            (res, { weight }) => res += weight,
            _.get(files, `${fileIndex}.weight`, 0) * position
        );
    }

    getPlaylist() {
        let getUrl = this._getUrl.bind(this),
            entries = this._files.map(({ name }, index) =>
                `#EXTINF:-1,${name}\n${getUrl({ query: { index } })}`);

        return ['#EXTM3U'].concat(entries).join('\n');
    }

    _getUrl({ partPath, query }) {
        return url.format({
            protocol: 'http',
            hostname: 'localhost',
            port: this._port,
            pathname: path.join.apply(path, ['stream', this._infoHash].concat(partPath || [])),
            query: query
        })
    }

    destroy() {
        return Promise.all([
            this._closeVlc(),
            new Promise(resolve => this._engine.remove(resolve)),
            new Promise(resolve => this._engine.destroy(resolve)),
        ]);
    }

    get state() {
        return this._state;
    }

    get infoHash() {
        return this._infoHash
    }
}

module.exports = StreamItem;
