import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { TripsPage } from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { TripPrintPage } from './pages/TripPrintPage';
import { getCurrentUser } from './auth/token';
import './index.css';

const App = () => {
  const currentUser = getCurrentUser();
  const isAuthed = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';

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
        <Route
          path="/trips/:id/print"
          element={isAuthed ? <TripPrintPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/users"
          element={
            isAuthed && isAdmin ? <AdminUsersPage /> : <Navigate to={isAuthed ? '/trips' : '/login'} />
          }
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
