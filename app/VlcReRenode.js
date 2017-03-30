const VLCRenode = require('vlc-renode');
const request = require('request');

class VLCReRenode extends VLCRenode {

    seek(val) {
        return this._req({
            command: 'seek',
            val: `${val*100}%`
        });
    }

    _reqPlaylist() {
        if (!this._optionsPlaylist) {
            this._optionsPlaylist = {
                url: `http://${this._host}:${this._port}/requests/playlist.json`,
                auth: { username: '', password: this._password }
            }
        }

        return new Promise((resolve, reject) => {
            request.get(this._optionsPlaylist, (error, response, body) => error ?
                reject(error) :
                resolve(body));
        });
    }

    connect() {
        super.connect();

        this.connectToPlaylist()
    }

    connectToPlaylist() {
        this._intervalPlaylist = setInterval(() => {
            this._reqPlaylist()
                .then(
                    body => this._onGettingPlaylistBody(body),
                    e => this._onGettingPlaylistBodyError(e)
                );
        }, this._intervalMilSecs);
    }


    disconnect() {
        super.disconnect();

        this.disconnectFromPlaylist();
    }

    disconnectFromPlaylist() {
        clearInterval(this._intervalPlaylist);
    }

    _onGettingPlaylistBody(body) {
        if (this._cachedLastBody !== body) {
            let formattedPlaylist = this._formatPlaylist(JSON.parse(body));

            this.emit('change:playlist', {
                oldVal: this._cachedPlaylist,
                newVal: formattedPlaylist
            });

            this._cachedLastBody = body;
            this._cachedPlaylist = formattedPlaylist;
        }
    }

    _onGettingPlaylistBodyError(error) {
        this.disconnectFromPlaylist();

        this.emit('error:playlist', { error });
    }

    _formatPlaylist(playlistItem) {
        let { type } = playlistItem,
            result = [];

        if (type === 'node') {
            let { children = [] } = playlistItem;

            children.forEach(obj => {
                result = result.concat(this._formatPlaylist(obj));
            });
        } else if (type === 'leaf') {
            result.push(playlistItem);
        }

        return result;
    }

}

module.exports = VLCReRenode;
