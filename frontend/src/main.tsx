import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { TripsPage } from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import './index.css';

const App = () => {
  const isAuthed = !!localStorage.getItem('accessToken');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/trips"
          element={isAuthed ? <TripsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/trips/:id"
          element={isAuthed ? <TripDetailPage /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={isAuthed ? '/trips' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
