import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function Hello() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  const fetchHtml = async () => {
    try {
      const pageHtml = await window.electron.ipcRenderer.invoke(
        'get-page-html',
        'https://wolt.com/hu/hun/budapest/restaurant/pesti-pipi-i-deak-ter?_gl=1%2A2qkwru%2A_up%2AMQ..%2A_gs%2AMQ..&gclid=Cj0KCQjwk5nVBhDiARIsAHNGqafWzE-vjczs8m1G8bZyjOg1Ct55hSNMaa3kRCaJ8Fy_JE5KqJgZLNwaAuwDEALw_wcB&gbraid=0AAAAAo_ea8qbQNKB1qnpiW6DXW6tSeG2f',
      );

      setHtml(pageHtml as string);
      setError('');
    } catch (caughtError) {
      setHtml('');
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    }
  };

  return (
    <div>
      <h1>Hello, World!</h1>
      <button onClick={fetchHtml}>Open Website</button>
      {error ? <div role="alert">{error}</div> : null}
      <pre>{html}</pre>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
