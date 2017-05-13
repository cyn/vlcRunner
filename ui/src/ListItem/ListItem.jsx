import React, { Component } from 'react';
import './ListItem.css';

const numeral = require('numeral');
const bytes = num => numeral(num).format('0.0b');

class ListItem extends Component {
    render() {
        let {
                name,
                downloaded,
                downloadSpeed,
                totalLength,
                vlcTotalPosition,
                onPlay,
                onRemove
            } = this.props,
            viewedFormated = (vlcTotalPosition * 100).toFixed(2),
            downloadedFormated = (downloaded * 100).toFixed(0);

        return (
            <div className="ListItem">
                <div className="ListItem__pos" style={{ width:`${viewedFormated}%` }}/>
                <div className="ListItem__wrap">
                    <a className="ListItem__play" href="#" onClick={onPlay}>
                        <div className="ListItem__icon"/>
                    </a>
                    <div className="ListItem__name">{name}</div>
                    <div className="ListItem__size">{bytes(totalLength)}</div>
                    <div className="ListItem__speed">{bytes(downloadSpeed)}/s</div>
                    <div className="ListItem__percentage">{downloadedFormated}%</div>
                    <a className="ListItem__remove" href="#" onClick={onRemove}>
                        <div className="ListItem__icon"/>
                    </a>
                </div>
            </div>
        );
    }
}

export default ListItem;
