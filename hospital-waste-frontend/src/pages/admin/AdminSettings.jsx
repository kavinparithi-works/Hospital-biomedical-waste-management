import React, { useState } from 'react';
import { ShieldCheck, Mail, Phone, Building, Save, Bell } from 'lucide-react';
import { api, session } from '../../services/api';
import { useT } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import { SecurityCard } from '../../components/ProfilePanel';

const PREFS_KEY = 'adminSettings';
const DEFAULT_PREFS = {
  hospitalName: 'KMCH Hospital (Kovai Medical Center & Hospital)',
  hospitalId: 'KMCH-BMWM-2026',
  emailAlerts: true,
  dailyReportSummary: true,
  urgentSharpsAlert: true
};

const loadPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return DEFAULT_PREFS; }
};

const AdminSettings = () => {
  const t = useT();
  const toast = useToast();
  const user = session.getUser() || {};
  const [prefs, setPrefs] = useState(loadPrefs);
  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '' });
  const [saving, setSaving] = useState(false);

  // Profile fields persist to MongoDB; facility/notification preferences persist locally
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateUser(user.id, { name: profile.name.trim(), phone: profile.phone.trim() });
      session.updateUser({ name: res.user.name, phone: res.user.phone });
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      toast.success(t('admin.settings.saved'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key) => (e) => {
    const next = { ...prefs, [key]: e.target.checked };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('admin.settings.title')}</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>{t('admin.settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="flex items-center gap-2" style={{ margin: 0 }}><ShieldCheck size={20} color="var(--primary-blue)" /> {t('admin.settings.adminProfile')}</h3>
          </div>

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('admin.settings.adminName')}</label>
                <input type="text" className="form-control" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required minLength={2} maxLength={80} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label flex items-center gap-1"><Mail size={14} /> {t('admin.settings.adminEmail')}</label>
                <input type="email" className="form-control" value={user.email || ''} readOnly style={{ backgroundColor: '#F4F7F9' }} title={t('admin.settings.emailReadonly')} />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t('admin.settings.emailReadonly')}</small>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label flex items-center gap-1"><Building size={14} /> {t('admin.settings.facilityName')}</label>
                <input type="text" className="form-control" value={prefs.hospitalName} onChange={e => setPrefs({ ...prefs, hospitalName: e.target.value })} required maxLength={120} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('admin.settings.licenseNo')}</label>
                <input type="text" className="form-control" value={prefs.hospitalId} onChange={e => setPrefs({ ...prefs, hospitalId: e.target.value })} required maxLength={60} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label flex items-center gap-1"><Phone size={14} /> {t('admin.settings.contactPhone')}</label>
                <input type="tel" className="form-control" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} maxLength={20} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{t('common.department')}</label>
                <input type="text" className="form-control" value={user.department || 'Administration'} readOnly style={{ backgroundColor: '#F4F7F9' }} />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E0E6ED', paddingTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? t('common.saving') : t('admin.settings.saveProfile')}</button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="card-header">
              <h4 className="flex items-center gap-2" style={{ margin: 0 }}><Bell size={18} color="#F39C12" /> {t('admin.settings.notificationPrefs')}</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
              {[['emailAlerts', t('admin.settings.emailAlerts')], ['dailyReportSummary', t('admin.settings.dailyReport')], ['urgentSharpsAlert', t('admin.settings.sharpsAlert')]].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer" style={{ gap: 8 }}>
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(prefs[key])} onChange={togglePref(key)} style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                </label>
              ))}
            </div>
          </div>

          <SecurityCard title={t('admin.settings.security')} />
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
