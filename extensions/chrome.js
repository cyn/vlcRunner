const { spawn } = require('child_process');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromeArgs = [
    `--pack-extension=chrome`
];

spawn(chromePath, chromeArgs, { stdio: 'ignore' });
