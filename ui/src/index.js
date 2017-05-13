import React from 'react';
import ReactDOM from 'react-dom';
import App from './App/App.jsx';
import './index.css';
const { ipcRenderer } = window.require('electron');
const { version } = require('../../package.json');

const rootEl = document.getElementById('root');

const onPlay = infoHash => ipcRenderer.send('play', { infoHash });
const onRemove = infoHash => ipcRenderer.send('remove', { infoHash });

const render = (data) => ReactDOM.render(
    React.createElement(App, {
        version,
        data,
        onPlay,
        onRemove
    }),
    rootEl
);

render();

ipcRenderer.on('update-info', (e, data) => {
    render(data);
});
