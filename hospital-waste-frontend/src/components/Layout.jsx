import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import LanguageSelector from './LanguageSelector';
import { useT } from '../i18n/LanguageContext';

const Layout = ({ children, role }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const t = useT();

  // Close the drawer whenever the route changes (mobile)
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  return (
    <div className="app-container fade-in">
      <div className="mobile-topbar">
        <button className="btn btn-outline btn-sm" onClick={() => setMenuOpen(true)} aria-label={t('common.menu')}>
          <Menu size={18} /> {t('common.menu')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: '#0F172A' }}>
          <ShieldCheck size={18} color="#2563EB" /> {t('common.appName')} <span style={{ color: '#2563EB', fontSize: '0.7rem' }}>{t('common.brandTag')}</span>
        </div>
        <LanguageSelector compact />
      </div>
      <div className={`sidebar-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <Sidebar role={role} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
