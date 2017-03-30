const { spawn } = require('child_process');
const VlcReRenode = require('./VlcReRenode');
const random_port = require('random-port');
const treeKill = require('tree-kill');

const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
const INIT_VLC_TIMEOUT = 1000;
const HTTP_CACHING=30000;
const INTERVAL_VLC_POLLING = 500;

module.exports = (params) => {
    return new Promise((resolve, reject) => {
        random_port(port => {
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
                    '--http-reconnect'
                ],
                proc = spawn(vlcPath, vlcArgs, { stdio: 'ignore' }),
                vlc = new VlcReRenode(options);

            (params || {}).onExit && proc.on('exit', params.onExit);

            setTimeout(() => {
                resolve({
                    vlc,
                    kill: () => new Promise(resolve => {
                        let { pid } = proc;

                        pid && treeKill(pid, 'SIGKILL', () => {
                            resolve();
                        });
                    })

                });
            }, INIT_VLC_TIMEOUT);
        });
    });
};
