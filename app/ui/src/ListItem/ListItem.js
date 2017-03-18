import React, { Component } from 'react';
import './ListItem.css';

const numeral = require('numeral');
const bytes = num => numeral(num).format('0.0b');

class ListItem extends Component {
    render() {
        let {
            name,
            downloadedPercentage,
            downloadSpeed,
            totalLength,
            play,
            remove
        } = this.props;

        return (
            <div className="ListItem">
                <a className="ListItem__play" href="#" onClick={play}>play</a>
                <div className="ListItem__name">{name}</div>
                <div className="ListItem__size">{bytes(totalLength)}</div>
                <div className="ListItem__speed">{bytes(downloadSpeed)}/s</div>
                <div className="ListItem__percentage">{downloadedPercentage}%</div>
                <a className="ListItem__remove" href="#" onClick={remove}>remove</a>
            </div>
        );
    }
}

export default ListItem;
