import logo from './logo.svg';
import './App.css';
import {useState} from "react";

function RESTButton() {
    const [buttonText, updateButtonText] = useState('Press Button to get Datetime');

    function handleClick() {
        fetch('http://localhost:3080/clock', {crossDomain: true})
            .then(response => response.json())
            .then(
                data => updateButtonText("Most recent date-time from rest endpoint: " + data.someDateTime)
            )
            .catch(reason => console.log(reason));
    }

    return (
        <button onClick={handleClick}>
            {buttonText}
        </button>
    );
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <RESTButton/>
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
