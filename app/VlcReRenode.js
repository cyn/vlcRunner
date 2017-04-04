const VLCRenode = require('vlc-renode');
const request = require('request');

class VLCReRenode extends VLCRenode {

    seek(val) {
        return this._req({
            command: 'seek',
            val: `${val*100}%`
        });
    }

    goto(id) {
        return this._req({
            command: 'pl_play',
            id: id
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

    _onGettingPlaylistBody(body) {
        if (this._cachedLastBody !== body) {
            let formattedPlaylist = this._formatPlaylist(JSON.parse(body));

            this.emit('change:playlist', this._cachedPlaylist, formattedPlaylist);

            this._cachedLastBody = body;
            this._cachedPlaylist = formattedPlaylist;
        }
    }

    _onGettingPlaylistBodyError(error) {
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

    getPlaylist() {
        return this._cachedPlaylist;
    }

    _req(params) {
        this._reqPlaylist().then(
            body => this._onGettingPlaylistBody(body),
            e => this._onGettingPlaylistBodyError(e)
        );

        let base = super._req(params);

        return this._isReady ?
            base :
            base.then(
                res => {
                    this._isReady = true;
                    this.emit('ready');

                    return res;
                },
                () => {}
            );
    }

    disconnect() {
        super.disconnect();
        this.emit('destruct');
    }

}

module.exports = VLCReRenode;
