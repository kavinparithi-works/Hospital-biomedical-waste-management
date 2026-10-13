import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle, Mail, Shield, Calendar, Activity,
  Scale, CheckCircle, Lock, Eye, EyeOff, Save, ArrowLeft, Edit2
} from 'lucide-react';
import { api } from '../services/api';

const StaffProfilePage = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const [stats, setStats] = useState({ totalRecords: 0, totalWeight: 0, complianceRate: 100 });
  const [loading, setLoading] = useState(true);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const allRecords = await api.getWasteRecords();
      const myRecords = allRecords.filter(r =>
        r.createdBy === currentUser.name || r.createdBy === currentUser.username
      );
      const totalWeight = myRecords.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
      const compliantCount = myRecords.filter(r => {
        const cat = (r.category || '').toLowerCase();
        const bin = (r.assignedBin || '').toLowerCase();
        if (cat.includes('infectious') || cat.includes('soiled') || cat.includes('chemical')) return bin.includes('yellow');
        if (cat.includes('sharp')) return bin.includes('white') || bin.includes('blue');
        if (cat.includes('recyclable') || cat.includes('plastic')) return bin.includes('red') || bin.includes('blue');
        if (cat.includes('general')) return bin.includes('green');
        return true;
      }).length;
      setStats({
        totalRecords: myRecords.length,
        totalWeight: totalWeight.toFixed(1),
        complianceRate: myRecords.length > 0 ? Math.round((compliantCount / myRecords.length) * 100) : 100
      });
    } catch (err) {
      console.error('Failed to load profile stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg({ type: '', text: '' });

    if (newPass.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setSaving(true);
      await api.changePassword({ currentPassword: currentPass, newPassword: newPass });
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to change password. Check your current password.' });
    } finally {
      setSaving(false);
    }
  };

  const memberSince = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>My Profile</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Your account details, activity statistics &amp; security settings
          </p>
        </div>
        <button
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
          onClick={() => navigate('/staff')}
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left: Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Avatar & Info */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{
              width: '88px', height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              <UserCircle size={52} color="white" />
            </div>

            <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.25rem' }}>
              {currentUser.name || currentUser.username || 'Medical Staff'}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              @{currentUser.username || 'staffuser'}
            </p>

            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
              <span className="badge badge-info" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                <Shield size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Medical Staff
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <Mail size={14} color="var(--primary-blue)" />
                <span>{currentUser.email || `${currentUser.username || 'staff'}@hospital.org`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} color="var(--primary-blue)" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="card">
            <div className="card-header">
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>My Activity Stats</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(52,152,219,0.06)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <Activity size={15} color="var(--primary-blue)" />
                  <span>Total Records Logged</span>
                </div>
                <strong style={{ color: 'var(--primary-blue)' }}>{loading ? '...' : stats.totalRecords}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(155,89,182,0.06)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <Scale size={15} color="#9B59B6" />
                  <span>Total Waste Logged</span>
                </div>
                <strong style={{ color: '#9B59B6' }}>{loading ? '...' : `${stats.totalWeight} kg`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(46,204,113,0.06)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <CheckCircle size={15} color="var(--green-success)" />
                  <span>Compliance Rate</span>
                </div>
                <strong style={{ color: 'var(--green-success)' }}>{loading ? '...' : `${stats.complianceRate}%`}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details + Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Account Details Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCircle size={18} /> Account Information
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', padding: '0.5rem 0' }}>
              {[
                { label: 'Full Name', value: currentUser.name || 'Medical Staff' },
                { label: 'Username', value: currentUser.username || 'staffuser' },
                { label: 'Email Address', value: currentUser.email || `${currentUser.username || 'staff'}@hospital.org` },
                { label: 'Role / Department', value: 'Medical Staff' },
                { label: 'Account Status', value: 'Active', isStatus: true },
                { label: 'System Access', value: 'Staff Dashboard, Waste Logging, AI Identifier' },
              ].map(({ label, value, isStatus }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {isStatus ? (
                      <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>● Active</span>
                    ) : (
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)' }}>{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Permissions */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <Shield size={18} /> Role Permissions
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.25rem 0' }}>
              {[
                { label: 'Log Waste Records', granted: true },
                { label: 'View Waste History', granted: true },
                { label: 'Use AI Waste Identifier', granted: true },
                { label: 'View Today\'s Summary', granted: true },
                { label: 'Admin Dashboard Access', granted: false },
                { label: 'Manage Users', granted: false },
                { label: 'Delete Records', granted: false },
                { label: 'System Reports', granted: false },
              ].map(({ label, granted }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: granted ? 'rgba(39,174,96,0.06)' : 'rgba(231,76,60,0.05)', fontSize: '0.85rem' }}>
                  <span style={{ color: granted ? 'var(--green-success)' : '#E74C3C', fontSize: '1rem' }}>{granted ? '✓' : '✗'}</span>
                  <span style={{ color: granted ? 'var(--text-dark)' : 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security / Change Password */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <Lock size={18} /> Security Settings
              </h3>
              {!showPasswordForm && (
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setShowPasswordForm(true)}
                >
                  <Edit2 size={13} /> Change Password
                </button>
              )}
            </div>

            {!showPasswordForm ? (
              <div style={{ padding: '0.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={14} />
                Password is set. Click "Change Password" to update your credentials.
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>
                {passMsg.text && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: passMsg.type === 'error' ? 'rgba(231,76,60,0.1)' : 'rgba(39,174,96,0.1)',
                    color: passMsg.type === 'error' ? '#C0392B' : '#27AE60',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}>
                    {passMsg.text}
                  </div>
                )}

                {/* Current Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter current password"
                      value={currentPass}
                      onChange={e => setCurrentPass(e.target.value)}
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(p => !p)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(p => !p)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-enter new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => { setShowPasswordForm(false); setPassMsg({ type: '', text: '' }); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfilePage;
