import React, { Component } from 'react';
import ListItem from '../ListItem/ListItem.js';

import './App.css';

class App extends Component {
    render() {
        let { props } = this,
            items = props.data || [],
            itemsCount = items.length;

        return <div className="App">
            <div className="App__title">{itemsCount ? 'Список потоков:' : 'Список пуст'}</div>
            {
                items.map(item => {
                    let { hash } = item;

                    return <ListItem
                        play={() => props.play(hash)}
                        remove={() => props.remove(hash)}
                        key={hash}
                        {...item}
                    />;
                })
            }
        </div>;
    }
}

export default App;

