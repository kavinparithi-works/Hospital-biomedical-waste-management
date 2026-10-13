import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, role }) => {
  return (
    <div className="app-container fade-in">
      <Sidebar role={role} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
