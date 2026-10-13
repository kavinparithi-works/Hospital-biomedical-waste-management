import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User, Shield, Truck, ArrowLeft, Info } from 'lucide-react';
import { api } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(username, password, selectedRole);
      if (response && response.user) {
        // Save session in localStorage
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        navigate(`/${response.user.role}`);
      }
    } catch (err) {
      const roleDefaults = {
        admin: 'adminname / adminpassword123',
        staff: 'staffname / staffpassword123',
        worker: 'workername / workerpassword123'
      };
      setError(err.message || `Invalid credentials. Try default: ${roleDefaults[selectedRole]}`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleHint = (role) => {
    switch(role) {
      case 'admin': return { user: 'adminname', pass: 'adminpassword123' };
      case 'staff': return { user: 'staffname', pass: 'staffpassword123' };
      case 'worker': return { user: 'workername', pass: 'workerpassword123' };
      default: return { user: '', pass: '' };
    }
  };

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.loginCard} className="card">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <Stethoscope size={40} color="white" />
          </div>
          <h1 style={styles.title}>KMCH <span style={{color: 'var(--primary-blue)'}}>HOSPITAL</span></h1>
          <p style={styles.subtitle}>Biomedical Waste Segregation & Management System</p>
        </div>

        {!selectedRole ? (
          <div style={styles.roleSelection} className="fade-in">
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Select Role to Login</h3>
            
            <div className="grid grid-cols-1" style={{ gap: '1rem' }}>
              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('admin')}
                className="role-btn-admin"
              >
                <div style={styles.roleIcon}><Shield size={24} color="var(--primary-blue)" /></div>
                <div style={styles.roleText}>
                  <strong>Admin Login</strong>
                  <span>System oversight & analytics</span>
                </div>
              </button>

              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('staff')}
                className="role-btn-staff"
              >
                <div style={styles.roleIcon}><User size={24} color="var(--accent-teal)" /></div>
                <div style={styles.roleText}>
                  <strong>Medical Staff Login</strong>
                  <span>Waste segregation & logging</span>
                </div>
              </button>

              <button 
                style={styles.roleButton} 
                onClick={() => handleRoleSelect('worker')}
                className="role-btn-worker"
              >
                <div style={styles.roleIcon}><Truck size={24} color="var(--yellow-bin)" /></div>
                <div style={styles.roleText}>
                  <strong>Worker Login</strong>
                  <span>Collection & disposal routing</span>
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
                <ArrowLeft size={20} /> Back
              </button>
              <h3 style={{ margin: '0 auto', paddingRight: '20px', textTransform: 'capitalize', color: 'var(--primary-blue)' }}>
                {selectedRole === 'staff' ? 'Medical Staff' : selectedRole} Login
              </h3>
            </div>

            {/* Helper Hint Box */}
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
                <strong>Default Demo Credentials (MongoDB):</strong><br />
                User: <code>{getRoleHint(selectedRole).user}</code> | Pass: <code>{getRoleHint(selectedRole).pass}</code>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username / Email</label>
              <input 
                type="text" 
                className="form-control" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`e.g. ${getRoleHint(selectedRole).user}`}
                required 
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required 
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Authenticating with MongoDB...' : 'Login to Dashboard'}
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
