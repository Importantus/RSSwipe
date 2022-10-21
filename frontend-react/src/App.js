import logo from './logo.svg';
import './App.css';
import {useState} from "react";

function ClockButton() {
    const [buttonText, updateButtonText] = useState('Press Button to get Datetime');

    function getClock() {
        fetch(process.env.REACT_APP_BACKEND_URL + '/clock', {crossDomain: true})
            .then(response => response.json())
            .then(
                data => updateButtonText("Most recent date-time from rest endpoint: " + data.someDateTime)
            )
            .catch(reason => console.log(reason));
    }

    return (
        <div>
            <button onClick={getClock}>
                Refresh Clock
            </button>
            <div>{buttonText}</div>
        </div>
    );
}

function DBQueryButton() {
    const [queryResult, updateButtonText] = useState('Press Button to execute predefined query');

    function executeQuery() {
        fetch(process.env.REACT_APP_BACKEND_URL + '/database/predefined', {crossDomain: true})
            .then(response => response.json())
            .then(
                data => updateButtonText(data.queryResponse)
            )
            .catch(reason => console.log(reason));
    }

    return (
        <div>
            <button onClick={executeQuery}>
                Predefined Query Button
            </button>
            <div>{JSON.stringify(queryResult)}</div>
        </div>
    );
}

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo"/>
                <p>
                    Edit <code>src/App.js</code> and save to reload.
                </p>
                <ClockButton/>
                <br/>
                <hr/>
                <br/>
                {/*<div>Input</div>
          <input id="queryText" type="text"/>*/}
                <DBQueryButton/>
                {/*<a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>*/}
            </header>
        </div>
    );
}

export default App;
