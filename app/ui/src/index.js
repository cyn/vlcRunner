import React from 'react';
import ReactDOM from 'react-dom';
import App from './App/App.js';
import './index.css';

const _ = require('lodash');
const electron = window.require('electron');
const fs = electron.remote.require('fs');
const ipcRenderer = electron.ipcRenderer;

const rootEl = document.getElementById('root');

const play = infoHash => ipcRenderer.send('play', { infoHash });
const remove = infoHash => ipcRenderer.send('remove', { infoHash });

const mapStateToProps = (state) => {
    _.extend(state, {
        play,
        remove
    });
    return state;
};

const render = (data) => ReactDOM.render(
    React.createElement(App, mapStateToProps({ data })),
    rootEl
);

render();

ipcRenderer.on('update-info', (e, data) => {
    render(data);
});
