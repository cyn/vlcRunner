import React, { Component } from 'react';
import './ListItem.css';

const numeral = require('numeral');
const bytes = num => numeral(num).format('0.0b');
const _ = require('lodash');

class ListItem extends Component {
    render() {
        let {
            name,
            downloadedPercentage,
            downloadSpeed,
            totalLength,
            play,
            remove,
        } = this.props;

        let pos = (_.get(this.props, 'vlcState.position', 0) * 100).toFixed(2);

        return (
            <div className="ListItem">
                <div className="ListItem__pos" style={{ width: `${pos}%` }}></div>
                <div className="ListItem__wrap">
                    <a className="ListItem__play" href="#" onClick={play}>play</a>
                    <div className="ListItem__name">{name}</div>
                    <div className="ListItem__size">{bytes(totalLength)}</div>
                    <div className="ListItem__speed">{bytes(downloadSpeed)}/s</div>
                    <div className="ListItem__percentage">{downloadedPercentage}%</div>
                    <a className="ListItem__remove" href="#" onClick={remove}>remove</a>
                </div>
            </div>
        );
    }
}

export default ListItem;
