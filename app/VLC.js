const { spawn } = require('child_process');
const VlcReRenode = require('./VlcReRenode');
const treeKill = require('tree-kill');

const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
const HTTP_CACHING=30000;
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
            `--http-caching=${HTTP_CACHING}`,
            `--http-port=${options.port}`,
            '--video-on-top',
            '--http-reconnect',
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
