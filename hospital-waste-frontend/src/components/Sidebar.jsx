import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Trash2,
  History,
  UserCheck,
  UserCircle,
  ClipboardList,
  X
} from 'lucide-react';
import { session } from '../services/api';
import { useT } from '../i18n/LanguageContext';
import LanguageSelector from './LanguageSelector';

const Sidebar = ({ role, open = false, onClose }) => {
  const navigate = useNavigate();
  const t = useT();
  const currentUser = session.getUser() || {};

  const handleLogout = () => {
    session.clear();
    navigate('/');
  };

  const adminLinks = [
    { path: '/admin', icon: <LayoutDashboard size={19} />, label: t('common.dashboard') },
    { path: '/admin/users', icon: <Users size={19} />, label: t('nav.userManagement') },
    { path: '/admin/settings', icon: <Settings size={19} />, label: t('nav.settings') },
  ];

  const staffLinks = [
    { path: '/staff', icon: <LayoutDashboard size={19} />, label: t('common.dashboard') },
    { path: '/staff/add-waste', icon: <Trash2 size={19} />, label: t('nav.addWasteRecord') },
    { path: '/staff/history', icon: <Activity size={19} />, label: t('nav.wasteHistory') },
    { path: '/staff/profile', icon: <UserCircle size={19} />, label: t('nav.myProfile') },
  ];

  const workerLinks = [
    { path: '/worker', icon: <LayoutDashboard size={19} />, label: t('common.dashboard') },
    { path: '/worker/assigned', icon: <ClipboardList size={19} />, label: t('nav.assignedCollections') },
    { path: '/worker/history', icon: <History size={19} />, label: t('nav.collectionHistory') },
    { path: '/worker/profile', icon: <UserCheck size={19} />, label: t('nav.myProfile') },
  ];

  let links = [];
  if (role === 'admin') links = adminLinks;
  else if (role === 'staff') links = staffLinks;
  else if (role === 'worker') links = workerLinks;

  const userInitial = (currentUser.name || currentUser.username || role || 'U').charAt(0).toUpperCase();
  const roleLabel = role === 'admin' ? t('roles.administrator') : role === 'staff' ? t('roles.medicalStaff') : t('roles.sanitationCrew');

  return (
    <aside className={`app-sidebar ${open ? 'open' : ''}`} style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.header}>
        <div style={styles.logoBadge}>
          <ShieldCheck size={22} color="#FFFFFF" strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <h2 style={styles.title}>{t('common.appName')}</h2>
            <span style={styles.brandTag}>{t('common.brandTag')}</span>
          </div>
          <div style={styles.subBrand}>{t('common.brandSub')}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sidebar-close" aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'none' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* System Status Pill */}
      <div style={styles.statusBox}>
        <div style={styles.statusDot}></div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>
          {t('common.systemLive')}
        </span>
      </div>

      {/* Navigation Links */}
      <nav style={styles.nav}>
        <div style={styles.sectionLabel}>{t('common.mainMenu')}</div>
        {links.map((link) => (
          <NavLink 
            key={link.path} 
            to={link.path} 
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {})
            })}
            end={link.path === `/${role}`}
          >
            {({ isActive }) => (
              <>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: isActive ? '#2563EB' : '#64748B' 
                }}>
                  {link.icon}
                </span>
                <span style={{ flex: 1, fontWeight: isActive ? 600 : 500 }}>
                  {link.label}
                </span>
                {link.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9',
                    color: isActive ? '#2563EB' : '#64748B'
                  }}>
                    {link.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile & Logout */}
      <div style={styles.footer}>
        <div style={styles.userProfileCard}>
          <div style={styles.avatar}>
            {userInitial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={styles.userName} title={currentUser.name || ''}>
              {currentUser.name || currentUser.username || roleLabel}
            </div>
            <div style={styles.userRole}>{roleLabel}</div>
          </div>
        </div>

        <LanguageSelector style={{ width: '100%' }} />

        <button 
          onClick={handleLogout}
          style={styles.logoutBtn}
          title={t('common.logout')}
        >
          <LogOut size={16} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #EAECF0',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    boxShadow: '1px 0 3px rgba(16, 24, 40, 0.02)',
  },
  header: {
    padding: '1.5rem 1.25rem 1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: 800,
    margin: 0,
    color: '#0F172A',
    letterSpacing: '-0.02em',
  },
  brandTag: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
  },
  subBrand: {
    fontSize: '0.7rem',
    color: '#64748B',
    fontWeight: 500,
    marginTop: '0.1rem',
  },
  statusBox: {
    margin: '0.25rem 1.25rem 0.75rem 1.25rem',
    padding: '0.45rem 0.75rem',
    backgroundColor: '#ECFDF5',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid #A7F3D0',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
  },
  nav: {
    padding: '0.75rem 0.85rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    overflowY: 'auto',
  },
  sectionLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#94A3B8',
    letterSpacing: '0.08em',
    padding: '0.5rem 0.75rem 0.35rem 0.75rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.85rem',
    borderRadius: '10px',
    color: '#475569',
    fontSize: '0.88rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  navLinkActive: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
  },
  footer: {
    padding: '1rem',
    borderTop: '1px solid #EAECF0',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userProfileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.5rem',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  userName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#0F172A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '0.7rem',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    width: '100%',
    padding: '0.55rem',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }
};

export default Sidebar;
