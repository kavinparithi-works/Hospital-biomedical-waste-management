import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

// Route protection component
const ProtectedRoute = ({ allowedRole, children }) => {
  const userJson = localStorage.getItem('currentUser');
  if (!userJson) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== allowedRole) {
      // Redirect user to their own dashboard if trying to access unauthorized route
      return <Navigate to={`/${user.role}`} replace />;
    }
  } catch (err) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
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
