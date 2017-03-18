import React, { Component } from 'react';
import ListItem from '../ListItem/ListItem.js';

import './App.css';

class App extends Component {
    render() {
        return <div className="App">
            <div className="App__title">Список потоков:</div>
            {
                (this.props.data || []).map(item => {
                    let { hash } = item;

                    return <ListItem
                        play={() => this.props.play(hash)}
                        remove={() => this.props.remove(hash)}
                        key={hash}
                        {...item}
                    />;
                })
            }
        </div>;
    }
}

export default App;

