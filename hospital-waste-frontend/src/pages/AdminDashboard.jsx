import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminOverview from './admin/AdminOverview';
import AdminUsers from './admin/AdminUsers';
import AdminSettings from './admin/AdminSettings';
import { api } from '../services/api';

const AdminDashboard = () => {
  const { pathname } = useLocation();
  const [loggedToday, setLoggedToday] = useState(null);

  // Lightweight shared stat for the user-management KPI cards
  useEffect(() => {
    if (!pathname.includes('/users')) return;
    api.getWasteStats().then(s => setLoggedToday(s.todayTotalRecords)).catch(() => {});
  }, [pathname]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (pathname.includes('/users')) return <div className="fade-in"><AdminUsers loggedToday={loggedToday} /></div>;
  if (pathname.includes('/settings')) return <div className="fade-in"><AdminSettings /></div>;
  return <div className="fade-in"><AdminOverview /></div>;
};

export default AdminDashboard;
