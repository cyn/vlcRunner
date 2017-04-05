const torrentStream = require('torrent-stream');
const EventEmitter = require('events');
const url = require('url');
const path = require('path');
const VLC = require('./VLC.js');
const randomPort = require('random-port');
const _ = require('lodash');
const mime = require('mime');

class StreamItem extends EventEmitter {

    constructor(parsedTorrent, autoPlay, port) {
        super();

        this._port = port;

        this._infoHash = parsedTorrent.infoHash;
        this._torrentName = parsedTorrent.name || parsedTorrent.infoHash;
        this._engine = torrentStream(parsedTorrent);
        this._files = [];
        this._vlcState = {};

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
        let {
            position,
            playlistId = _.get(playlist, '[0].id', -1)
        } = this._vlcState;

        if (position) {
            this._vlc.once('change:currentplid', () => this._vlc.seek(position));
        }

        this._vlc.goto(playlistId);

        this._vlc.on('change:position', (oldVal, newVal) => this._changeVlcState({ position: newVal }));
        this._vlc.on('change:currentplid', (oldVal, newVal) => this._changeVlcState({ playlistId: newVal }));
    }

    _changeVlcState({ position, playlistId }) {
        if (!_.isUndefined(position) && position !== this._vlcState.position) {
            this._vlcState.position = position;
        }

        if (!_.isUndefined(playlistId) && this._vlcState.playlistId !== playlistId) {
            this._vlcState.playlistId = playlistId;
        }
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
            activePeers: wires.filter(wire => !wire.peerChoking).length,
            vlcState: this._vlcState
        };
    }

    getPlaylist() {
        let getUrl = this._getUrl.bind(this),
            entries = this._files.reduce((res, { name }, index) => {
                if (/^video\/.*/.test(mime.lookup(name))) {
                    let href = getUrl({ query: { index } });

                    res.push(`#EXTINF:-1,${name}\n${href}`);
                }

                return res;
            }, []);

        return ['#EXTM3U'].concat(entries).join('\n');
    }

    _getTotalLength() {
        return this._totalLength ||
            (this._totalLength = this._files.reduce((prevFileLength, currFile) => prevFileLength + currFile.length, 0));
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
}

module.exports = StreamItem;
