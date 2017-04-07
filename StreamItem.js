const torrentStream = require('torrent-stream');
const EventEmitter = require('events');
const url = require('url');
const path = require('path');
const VLC = require('./VLC.js');
const randomPort = require('random-port');
const _ = require('lodash');
const mime = require('mime');
const isVideo = fileName => /^video\/.*/.test(mime.lookup(fileName));

class StreamItem extends EventEmitter {

    constructor({ parsedTorrent, state, autoPlay, port }) {
        super();

        this._port = port;

        this._infoHash = parsedTorrent.infoHash;
        this._torrentName = parsedTorrent.name || parsedTorrent.infoHash;
        this._engine = torrentStream(parsedTorrent);
        this._files = [];
        this._state = state || {};
        this._playlistIds = [];

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
        this._playlistIds = playlist.map(({ id }) => id);

        let {
            position,
            playlistId = this._playlistIds[0]
        } = this._state;

        if (position) {
            this._vlc.once('change:currentplid', () => this._vlc.seek(position));
        }

        this._vlc.goto(playlistId);

        this._vlc.on('change:position', (oldVal, newVal) => this._changeState({ position: newVal }));
        this._vlc.on('change:currentplid', (oldVal, newVal) => this._changeState({ playlistId: newVal }));
    }

    _changeState({ position, playlistId }) {
        if (!_.isUndefined(position) && position !== this._state.position) {
            this._state.position = position;
        }

        if (!_.isUndefined(playlistId) && this._state.playlistId !== playlistId) {
            this._state.playlistId = playlistId;
        }
    }

    getFile(index) {
        return this._files[index];
    }

    getInfo() {
        let { swarm } = this._engine;
        let { totalLength, weightFiles } = this._getVideoFilesInfo(),
            currentPositionAtFile = _.get(this._state, 'position', 0),
            currentPlaylistId = _.get(this._state, 'playlistId', -1),
            currentFileIndex = _.get(this._fileIndexesInPlaylist, this._playlistIds.indexOf(currentPlaylistId), 0),
            weightCurrentFile = _.get(weightFiles, currentFileIndex, 0);

        return {
            hash: this._infoHash,
            name: this._torrentName,
            totalLength,
            downloaded: this._verifiedPiecesCount / this._piecesCount,
            downloadSpeed: parseInt(swarm.downloadSpeed(), 10),
            vlcTotalPosition: weightCurrentFile * currentPositionAtFile
        };
    }

    getPlaylist() {
        let getUrl = this._getUrl.bind(this),
            fileIndexesInPlaylist = [],
            entries = this._files
                .reduce((res, { name }, index) => res.concat(
                    isVideo(name) ?
                        {
                            name,
                            index,
                            entry: `#EXTINF:-1,${name}\n${getUrl({ query: { index } })}`
                        } :
                        []
                ), [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(a => {
                    fileIndexesInPlaylist.push(a.index);

                    return a.entry;
                });

        this._fileIndexesInPlaylist = fileIndexesInPlaylist;

        return ['#EXTM3U'].concat(entries).join('\n');
    }

    _getVideoFilesInfo() {
         if (!this._totalLength || this._weightFiles) {
             let videoFilesSize = {};

             let totalLength = this._totalLength = this._files.reduce((prevFilesLength, { length }, fileIndex) => {
                 videoFilesSize[fileIndex] = length;

                 return prevFilesLength + length;
             }, 0);

             this._weightFiles = Object.keys(videoFilesSize).reduce((res, fileIndex) => {
                 let fileLength = videoFilesSize[fileIndex];

                 res[fileIndex] = fileLength / totalLength;

                 return res;
             }, {});
         }

        return {
            totalLength: this._totalLength,
            weightFiles: this._weightFiles
        };
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
