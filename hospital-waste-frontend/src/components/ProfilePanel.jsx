import React, { useState } from 'react';
import { UserCircle, Mail, Shield, Calendar, Lock, Eye, EyeOff, Save, Edit2, Phone, Building, Truck } from 'lucide-react';
import { api, session } from '../services/api';
import { useT } from '../i18n/LanguageContext';
import { useToast } from './Toast';
import { formatISTDate } from '../utils/dateUtils';

const PasswordInput = ({ value, onChange, placeholder, autoComplete }) => {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} className="form-control" placeholder={placeholder} value={value} onChange={onChange} required minLength={6} autoComplete={autoComplete} style={{ paddingRight: '2.5rem' }} />
      <button type="button" onClick={() => setShow(p => !p)} aria-label={show ? t('login.hidePassword') : t('login.showPassword')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

// Change-password form backed by POST /api/auth/change-password
export const SecurityCard = ({ title }) => {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const reset = () => { setOpen(false); setMsg({ type: '', text: '' }); setCurrentPass(''); setNewPass(''); setConfirmPass(''); };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    if (newPass.length < 6) return setMsg({ type: 'error', text: t('profile.passwordMin') });
    if (newPass !== confirmPass) return setMsg({ type: 'error', text: t('profile.passwordsMismatch') });
    try {
      setSaving(true);
      await api.changePassword({ currentPassword: currentPass, newPassword: newPass });
      toast.success(t('profile.passwordChanged'));
      reset();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Lock size={18} /> {title || t('profile.securitySettings')}</h3>
        {!open && (
          <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}><Edit2 size={13} /> {t('profile.changePassword')}</button>
        )}
      </div>
      {!open ? (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={14} /> {t('profile.passwordSet')}
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {msg.text && (
            <div role="alert" style={{ padding: '0.75rem 1rem', backgroundColor: msg.type === 'error' ? 'rgba(231,76,60,0.1)' : 'rgba(39,174,96,0.1)', color: msg.type === 'error' ? '#C0392B' : '#27AE60', borderRadius: '8px', fontSize: '0.875rem' }}>{msg.text}</div>
          )}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('profile.currentPassword')}</label>
            <PasswordInput value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder={t('profile.enterCurrent')} autoComplete="current-password" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('profile.newPassword')}</label>
            <PasswordInput value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t('profile.atLeast6')} autoComplete="new-password" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('profile.confirmPassword')}</label>
            <input type="password" className="form-control" placeholder={t('profile.reenter')} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={reset}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}><Save size={15} /> {saving ? t('common.saving') : t('profile.updatePassword')}</button>
          </div>
        </form>
      )}
    </div>
  );
};

// Editable name + phone for the logged-in user (PUT /api/users/:id)
export const EditProfileCard = ({ onUpdated }) => {
  const t = useT();
  const toast = useToast();
  const user = session.getUser() || {};
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateUser(user.id, { name: name.trim(), phone: phone.trim() });
      session.updateUser({ name: res.user.name, phone: res.user.phone });
      toast.success(t('profile.profileUpdated'));
      if (onUpdated) onUpdated(res.user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Edit2 size={18} /> {t('profile.editProfile')}</h3>
      </div>
      <form onSubmit={submit} className="grid grid-cols-2" style={{ gap: '1rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('profile.fullName')}</label>
          <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('profile.phoneNumber')}</label>
          <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </div>
  );
};

// Avatar + identity card
export const IdentityCard = ({ user, roleLabel, icon }) => {
  const t = useT();
  const isWorker = user.role === 'worker';
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: isWorker ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, var(--primary-blue), var(--accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: 'var(--shadow-md)' }}>
        {icon || (isWorker ? <Truck size={44} color="white" /> : <UserCircle size={52} color="white" />)}
      </div>
      <h2 style={{ margin: '0 0 0.3rem', fontSize: '1.25rem' }}>{user.name || user.username}</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>@{user.username}</p>
      <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'center' }}>
        <span className={`badge ${isWorker ? 'badge-warning' : 'badge-info'}`} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
          <Shield size={13} /> {roleLabel}
        </span>
      </div>
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} color="var(--primary-blue)" /><span style={{ wordBreak: 'break-all' }}>{user.email}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} color="var(--primary-blue)" /><span>{user.phone || '—'}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building size={14} color="var(--primary-blue)" /><span>{user.department || '—'}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} color="var(--primary-blue)" /><span>{t('profile.memberSince', { date: user.createdAt ? formatISTDate(user.createdAt) : '—' })}</span></div>
      </div>
    </div>
  );
};
