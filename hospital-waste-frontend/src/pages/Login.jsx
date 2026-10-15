import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Stethoscope, User, Shield, Truck, ArrowLeft, Info, Eye, EyeOff } from 'lucide-react';
import { api, session } from '../services/api';
import { useT } from '../i18n/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

// Seeded demo accounts (see hospital-waste-backend/server.js). Only shown in development builds.
const DEMO_ACCOUNTS = {
  admin: { user: 'adminname', pass: 'Password123' },
  staff: { user: 'staff001', pass: 'Password123' },
  worker: { user: 'worker001', pass: 'Password123' }
};
const SHOW_DEMO_HINTS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

const Login = () => {
  const navigate = useNavigate();
  const t = useT();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already signed in → go straight to the dashboard
  const existing = session.getUser();
  if (existing && session.getToken()) {
    return <Navigate to={`/${existing.role}`} replace />;
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(username.trim(), password, selectedRole);
      if (response && response.user) {
        session.set(response.token, response.user);
        navigate(`/${response.user.role}`);
      }
    } catch (err) {
      setError(err.message || t('login.invalid'));
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = selectedRole === 'admin' ? t('roles.admin') : selectedRole === 'staff' ? t('roles.medicalStaff') : t('roles.worker');
  const hint = DEMO_ACCOUNTS[selectedRole] || { user: '', pass: '' };

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.loginCard} className="card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <LanguageSelector compact />
        </div>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <Stethoscope size={40} color="white" />
          </div>
          <h1 style={styles.title}>{t('common.appName')} <span style={{color: 'var(--primary-blue)'}}>{t('common.hospital').replace(/^KMCH\s*/i, '')}</span></h1>
          <p style={styles.subtitle}>{t('login.subtitle')}</p>
        </div>

        {!selectedRole ? (
          <div style={styles.roleSelection} className="fade-in">
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-dark)' }}>{t('login.selectRole')}</h3>
            
            <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('admin')}
                className="role-btn-admin"
              >
                <div style={styles.roleIcon}><Shield size={24} color="var(--primary-blue)" /></div>
                <div style={styles.roleText}>
                  <strong>{t('login.adminLogin')}</strong>
                  <span>{t('login.adminDesc')}</span>
                </div>
              </button>

              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('staff')}
                className="role-btn-staff"
              >
                <div style={styles.roleIcon}><User size={24} color="var(--accent-teal)" /></div>
                <div style={styles.roleText}>
                  <strong>{t('login.staffLogin')}</strong>
                  <span>{t('login.staffDesc')}</span>
                </div>
              </button>

              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('worker')}
                className="role-btn-worker"
              >
                <div style={styles.roleIcon}><Truck size={24} color="var(--yellow-bin)" /></div>
                <div style={styles.roleText}>
                  <strong>{t('login.workerLogin')}</strong>
                  <span>{t('login.workerDesc')}</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                onClick={() => setSelectedRole(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
              >
                <ArrowLeft size={20} /> {t('common.back')}
              </button>
              <h3 style={{ margin: '0 auto', paddingRight: '20px', color: 'var(--primary-blue)' }}>
                {t('login.roleLogin', { role: roleTitle })}
              </h3>
            </div>

            {SHOW_DEMO_HINTS && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: 'var(--light-blue)', 
                borderRadius: '8px', 
                marginBottom: '1.25rem', 
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--primary-blue)'
              }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>{t('login.demoCreds')}:</strong><br />
                  {t('login.user')}: <code>{hint.user}</code> | {t('login.pass')}: <code>{hint.pass}</code>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" style={{ padding: '0.75rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-username">{t('login.usernameOrEmail')}</label>
              <input 
                id="login-username"
                type="text" 
                className="form-control" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={hint.user ? `e.g. ${hint.user}` : ''}
                autoComplete="username"
                required 
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="login-password">{t('common.password')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.enterPassword')}
                  autoComplete="current-password"
                  required 
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        )}
      </div>
      
      <style>{`
        .role-btn-admin:hover { border-color: var(--primary-blue) !important; background-color: var(--light-blue) !important; }
        .role-btn-staff:hover { border-color: var(--accent-teal) !important; background-color: rgba(0, 166, 166, 0.05) !important; }
        .role-btn-worker:hover { border-color: var(--yellow-bin) !important; background-color: rgba(241, 196, 15, 0.05) !important; }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-color)',
    padding: '1rem',
    backgroundImage: 'linear-gradient(135deg, #F4F7F9 0%, #EBF4FA 100%)',
  },
  loginCard: {
    maxWidth: '450px',
    width: '100%',
    padding: '2.5rem',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    backgroundColor: 'var(--primary-blue)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  },
  roleSelection: {
    marginTop: '1.5rem',
  },
  roleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'white',
    border: '2px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'var(--transition)',
    textAlign: 'left',
  },
  roleIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  }
};

export default Login;
