import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import { session, onUnauthorized } from './services/api';
import { useToast } from './components/Toast';
import { useT } from './i18n/LanguageContext';

// Route protection component
const ProtectedRoute = ({ allowedRole, children }) => {
  const user = session.getUser();
  if (!user || !session.getToken()) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== allowedRole) {
    // Redirect user to their own dashboard if trying to access unauthorized route
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
};

// Redirects to the login page whenever the API reports an expired/invalid session
const SessionGuard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();
  useEffect(() => {
    onUnauthorized(() => {
      toast.error(t('common.sessionExpired'));
      navigate('/', { replace: true });
    });
    return () => onUnauthorized(null);
  }, [navigate, toast, t]);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <SessionGuard />
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Protected Routes with Role Guard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRole="admin">
              <Layout role="admin"><AdminDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/*"
          element={
            <ProtectedRoute allowedRole="staff">
              <Layout role="staff"><StaffDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker/*"
          element={
            <ProtectedRoute allowedRole="worker">
              <Layout role="worker"><WorkerDashboard /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
