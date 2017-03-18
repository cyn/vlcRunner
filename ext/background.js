chrome.contextMenus.create({
    title: 'VLC runner',
    contexts: ['all'],
    onclick: info => fetch('http://localhost:4545/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: info.linkUrl })
    })
});
