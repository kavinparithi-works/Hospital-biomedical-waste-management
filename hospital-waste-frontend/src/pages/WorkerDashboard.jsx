import React from 'react';
import { useLocation } from 'react-router-dom';
import WorkerDashboardPage from './worker/WorkerDashboardPage';
import WorkerAssignedPage from './worker/WorkerAssignedPage';
import WorkerHistoryPage from './worker/WorkerHistoryPage';
import WorkerProfilePage from './worker/WorkerProfilePage';

const WorkerDashboard = () => {
  const location = useLocation();

  if (location.pathname.includes('/assigned')) {
    return <WorkerAssignedPage />;
  }

  if (location.pathname.includes('/history')) {
    return <WorkerHistoryPage />;
  }

  if (location.pathname.includes('/profile')) {
    return <WorkerProfilePage />;
  }

  return <WorkerDashboardPage />;
};

export default WorkerDashboard;
