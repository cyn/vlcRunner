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
            streams: '[]'
        }
    }
});

module.exports = {

    save({ torrents = new Map(), streams = new Map() }) {
        store.set('state', {
            torrents: mapToJson(torrents),
            streams: mapToJson(streams)
        })
    },

    load() {
        let { torrents, streams } = store.get('state');

        return {
            torrents: jsonToMap(torrents),
            streams: jsonToMap(streams)
        };
    }

};
