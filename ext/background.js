(function() {
    const host = 'http://127.0.0.1:4545/start';

    chrome.contextMenus.create({
        title: 'VLC runner',
        contexts: ['all'],
        onclick: function(info) {
            fetch(host, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: info.linkUrl })
            }).then(function(response) {
                console.log(response);
            });
        }
    });
})();
