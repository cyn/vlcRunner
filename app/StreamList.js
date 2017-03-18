const _ = require('lodash');
const StreamItem = require('./StreamItem');
const EventEmitter = require('events');
const Vlc = require('./Vlc');

class StreamList extends EventEmitter {

    constructor({ host, port }) {
        super();

        this._hostPort = { host, port };
        this._vlc = new Vlc(this._hostPort);

        this._list = {};
    }

    addItem(parsedTorrent) {
        let { infoHash } = parsedTorrent;

        if (!this._list[infoHash]) {
            this._list[infoHash] = new StreamItem(parsedTorrent, this._vlc);
        }

        return this.getItem(infoHash);
    }

    getItem(infoHash) {
        return this._list[infoHash];
    }

    hasStreamExist(infoHash) {
        return !!this._list[infoHash];
    }

    getFileFromStream({ infoHash, fileIndex }) {
        let streamItem = this.getItem(infoHash);

        return streamItem.getFile(fileIndex);
    }

    play(infoHash) {
        let streamItem = this.getItem(infoHash);

        return streamItem.play();
    }

    getPlaylist(infoHash) {
        let streamItem = this.getItem(infoHash);

        return streamItem.getPlaylist(this._hostPort);
    }

    getInfo() {
        return Object.keys(this._list).reverse().map(infoHash => {
            return this._list[infoHash].getInfo();
        });
    }

    remove(infoHash) {
        let streamItem = this.getItem(infoHash);

        streamItem.destroy().then(() => {
            this._list[infoHash] = null;
            delete this._list[infoHash];
        });
    }

}

module.exports = StreamList;
