const { spawn } = require('child_process');
const VlcReRenode = require('./VlcReRenode');
const random_port = require('random-port');
const treeKill = require('tree-kill');

const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
const HTTP_CACHING=30000;
const INTERVAL_VLC_POLLING = 500;

let getVlc = (params) => {
    let { port, onExit } = params || {},
        options = {
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
            '--http-reconnect'
        ],
        proc = spawn(vlcPath, vlcArgs, {stdio: 'ignore'}),
        vlc = new VlcReRenode(options);

    onExit && proc.on('exit', onExit);

    return {
        vlc,
        kill: () => new Promise(resolve => {
            let {pid} = proc;

            pid && treeKill(pid, 'SIGKILL', () => {
                resolve();
            });
        })

    };
};

module.exports = getVlc;
