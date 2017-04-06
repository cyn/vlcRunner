const { spawn } = require('child_process');
const VlcReRenode = require('./VlcReRenode');
const treeKill = require('tree-kill');

const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
const NETWORK_CACHING=10000;
const INTERVAL_VLC_POLLING = 500;

let getVlc = (port) => {
    let options = {
            password: 'secret',
            host: 'localhost',
            port,
            interval: INTERVAL_VLC_POLLING
        },
        vlcArgs = [
            '--extraintf=http',
            `--http-password=${options.password}`,
            `--http-port=${options.port}`,
            '--http-reconnect',
            `--network-caching=${NETWORK_CACHING}`,
            '--video-on-top',
            '--no-playlist-autostart'
        ],
        vlcProc = spawn(vlcPath, vlcArgs, { stdio: 'ignore' }),
        { pid } = vlcProc,
        vlc = new VlcReRenode(options);

    vlc.kill = () => pid && treeKill(pid, 'SIGKILL');

    vlcProc.on('exit', () => vlc.disconnect());

    return vlc;
};

module.exports = getVlc;
