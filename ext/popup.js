const host = 'http://127.0.0.1:4545/info';
const print = data => {
    let {
        player,
        href,
        filename,
        filelength,
        downloadSpeed,
        peers,
        totalPeers,
        path,
        downloaded,
        downloadedPercentage,
        uploaded,
        runtime,
        hotswaps,
        verified,
        invalid,
        queued
    } = data;

    let template = [
        `open ${player} and enter <b>${href}</b> as the network address`,
        `streaming ${filename} (${filelength}) - ${downloadSpeed}/s from ${peers}/${totalPeers} peers`,
        `path ${path}`,
        `downloaded ${downloaded} (${downloadedPercentage}%) and uploaded ${uploaded} in ${runtime}s with ${hotswaps} hotswaps`,
        `verified ${verified} pieces and received ${invalid} invalid pieces`,
        `peer queue size is ${queued}`
    ];

    document.body.innerHTML = template.join('<br>');
};
const request = host => fetch(host).then(res => res.json());
const requestAndPrint = () => {
    request(host).then(data => {
        print(data)
    });
};

window.onload = () => {
    requestAndPrint();
    window.setInterval(requestAndPrint, 1000);
};
