import React, { Component } from 'react';
import ListItem from '../ListItem/ListItem.jsx';

const { remote } = window.require('electron');
const { Menu, shell } = remote;

import './App.css';

class App extends Component {

    constructor(props) {
        super(props);

        this._toggleContextMenu = this._toggleContextMenu.bind(this);
    }

    render() {
        let { props } = this,
            items = props.data || [],
            itemsCount = items.length;

        return <div className="App">
            <div className="App__title">{itemsCount ? 'Список потоков:' : 'Список пуст'}</div>
            <div
                className="App__settings"
                onClick={this._toggleContextMenu}
            />
            {items.map(item => {
                let {hash} = item;

                return <ListItem
                    onPlay={() => props.onPlay(hash)}
                    onRemove={() => props.onRemove(hash)}
                    onRefresh={() => props.onRefresh(hash)}
                    key={hash}
                    {...item}
                />;
            })}
        </div>;
    }

    _toggleContextMenu() {
        this._getContextMenu().popup();
    }

    _getContextMenu() {
        return this._contextMenu || (this._contextMenu = Menu.buildFromTemplate([
            {
                label: `VLC runner (v${this.props.version})`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: 'О программе',
                click() {
                    shell.openExternal(`https://github.com/cyn/vlcRunner/blob/master/README.md`);
                }

            },
            {
                label: 'Расширение для Google Chrome',
                click() {
                    shell.openExternal('http://localhost:4545/chrome.crx');
                }
            },
            {
                label: 'Закрыть',
                accelerator: 'Cmd+Q',
                role: 'quit'
            }
        ]));
    }
}

export default App;

