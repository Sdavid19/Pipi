import { useState } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from 'react-router-dom';
import './App.css';

  const stores = [
    'Campona',
    'Corvin',
    'Deák',
    'Keleti',
    'Pólus',
    'Remiz (Kispest)',
    'Stadion',
    'Thököly',
    'Újpest',
    'Westend',
    'Vác'
  ];

function Wolt() {
  const [itemsWithNameAndAvailability, setItemsWithNameAndAvailability] =
    useState<Record<string, Record<string, boolean>>>({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHtml = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await window.electron.ipcRenderer.invoke(
        'get-page-html',
      );

      setItemsWithNameAndAvailability(result);
    } catch (caughtError) {
      setItemsWithNameAndAvailability({});

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setLoading(false);
    }
  };

  const saveExcel = async () => {
    try {
      setError('');

      await window.electron.ipcRenderer.invoke(
        'save-excel',
        itemsWithNameAndAvailability,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    }
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="mb-6 text-4xl font-bold">
        Wolt ellenőrző
      </h1>

      <div className="mb-6 flex gap-3">
        <button
          onClick={fetchHtml}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading && (
            <span className="loading loading-spinner loading-sm" />
          )}

          {loading ? 'Adatok lekérése...' : 'Adatok lekérése'}
        </button>

        <button
          onClick={saveExcel}
          disabled={
            loading ||
            Object.keys(itemsWithNameAndAvailability).length === 0
          }
          className="btn btn-success"
        >
          Excel mentése
        </button>
      </div>

      {error && (
        <div role="alert" className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {Object.keys(itemsWithNameAndAvailability).length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Termék</th>

                {stores.map((store) => (
                  <th key={store}>{store}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Object.entries(itemsWithNameAndAvailability).map(
                ([productName, storeAvailability]) => (
                  <tr key={productName}>
                    <td>{productName}</td>

                    {stores.map((store) => {
                      const available = storeAvailability[store];

                      return (
                        <td key={store}>
                          {available === undefined ? (
                            <span className="badge badge-warning">
                              Nincsen
                            </span>
                          ) : available ? (
                            <span className="badge badge-success">
                              Bekapcsolva
                            </span>
                          ) : (
                            <span className="badge badge-error">
                              Kikapcsolva
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Foodora() {
  return (
    <div className="flex flex-col items-center bg-base-200 p-8">
      <h1 className="mb-6 text-4xl font-bold">
        Foodora ellenőrző
      </h1>

      <div className="alert alert-info max-w-xl">
        <span>A Foodora ellenőrzés hamarosan elérhető.</span>
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="mr-10">
        <span className="text-xl font-bold">
          Pipi ellenőrző
        </span>
      </div>

      <div>
        <ul className="menu menu-horizontal px-1">
          <li>
            <NavLink
              to="/wolt"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Wolt
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/foodora"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Foodora
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <>
      <Navigation />

      <Routes>
        <Route path="/" element={<Navigate to="/wolt" replace />} />
        <Route path="/wolt" element={<Wolt />} />
        <Route path="/foodora" element={<Foodora />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}