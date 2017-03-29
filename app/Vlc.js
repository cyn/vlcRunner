const child_process = require('child_process');
const StreamItem = require('./StreamItem');
const treeKill = require('tree-kill');

class Vlc {

    constructor({ host, port }) {
        this._host = host;
        this._port = port;

        this._vlcChildProceses = {};
    }

    play({ infoHash, onExit, autoPlay }) {
        let VLC_ARGS = `-q --video-on-top --play-and-exit --http-caching=30000 --http-reconnect ` +
                `${autoPlay ? '' : '--no-playlist-autostart'}`,
            root = '/Applications/VLC.app/Contents/MacOS/VLC',
            href = StreamItem.getPlaylistUrl({
                host: this._host,
                port: this._port,
                infoHash
            }),
            cmd = `${root} ${VLC_ARGS} ${href}`;

        (this._vlcChildProceses[infoHash] ? this.close(infoHash) : Promise.resolve()).then(() => {
            this._vlcChildProceses[infoHash] = child_process.exec(cmd);

            if (onExit) {
                this._vlcChildProceses[infoHash].on('exit', onExit);
            }
        });
    }

    close(infoHash) {
        return new Promise(resolve => {
            let { pid } = this._vlcChildProceses[infoHash];

            pid && treeKill(pid, 'SIGKILL', () => {
                resolve();
            });
        })
    }

    closeAll() {
        Object.keys(this._vlcChildProceses).forEach(infoHash => {
            if (this._vlcChildProceses.hasOwnProperty(infoHash)) {
                this.close(infoHash);
            }
        }, this);
    }

}

module.exports = Vlc;
