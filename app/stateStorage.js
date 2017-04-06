const Store = require('./Store');

const mapToJson = map => JSON.stringify([...map]);
const jsonToMap = jsonStr => {
    try {
        return new Map(JSON.parse(jsonStr));
    } catch(e) {
        return new Map();
    }
};

const store = new Store({
    configName: 'state',
    defaults: {
        state: {
            torrents: '[]',
            vlc: '[]'
        }
    }
});

module.exports = {

    save({ torrents = new Map(), vlc = new Map() }) {
        store.set('state', {
            torrents: mapToJson(torrents),
            vlc: mapToJson(vlc)
        })
    },

    load() {
        let { torrents, vlc } = store.get('state');

        return {
            torrents: jsonToMap(torrents),
            vlc: jsonToMap(vlc)
        };
    }

};
