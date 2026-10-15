import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Shield, Activity, Scale, CheckCircle, ArrowLeft } from 'lucide-react';
import { api, session } from '../services/api';
import { useT } from '../i18n/LanguageContext';
import { IdentityCard, SecurityCard, EditProfileCard } from '../components/ProfilePanel';
import { isCompliant, isCancelled } from '../utils/waste';

const StaffProfilePage = () => {
  const navigate = useNavigate();
  const t = useT();
  const [user, setUser] = useState(session.getUser() || {});
  const [stats, setStats] = useState({ totalRecords: 0, totalWeight: 0, complianceRate: 100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [allRecords, me] = await Promise.all([api.getWasteRecords(), api.me().catch(() => null)]);
        if (cancelled) return;
        if (me?.user) { session.updateUser(me.user); setUser(me.user); }
        const myRecords = allRecords.filter(r => !isCancelled(r) && (r.createdBy === (me?.user?.name || user.name) || r.createdBy === user.username));
        const totalWeight = myRecords.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
        const compliantCount = myRecords.filter(r => isCompliant(r.category, r.assignedBin)).length;
        setStats({
          totalRecords: myRecords.length,
          totalWeight: totalWeight.toFixed(1),
          complianceRate: myRecords.length > 0 ? Math.round((compliantCount / myRecords.length) * 100) : 100
        });
      } catch (err) {
        if (err.status !== 401) console.error('Failed to load profile stats:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissions = [
    { label: t('profile.perms.logWaste'), granted: true },
    { label: t('profile.perms.viewHistory'), granted: true },
    { label: t('profile.perms.aiIdentifier'), granted: true },
    { label: t('profile.perms.todaySummary'), granted: true },
    { label: t('profile.perms.adminAccess'), granted: false },
    { label: t('profile.perms.manageUsers'), granted: false },
    { label: t('profile.perms.deleteRecords'), granted: false },
    { label: t('profile.perms.systemReports'), granted: false },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('profile.title')}</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('profile.subtitle')}</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/staff')}><ArrowLeft size={15} /> {t('common.backToDashboard')}</button>
      </div>

      <div className="profile-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <IdentityCard user={user} roleLabel={t('roles.medicalStaff')} />

          <div className="card">
            <div className="card-header"><h4 style={{ margin: 0, fontSize: '0.9rem' }}>{t('profile.activityStats')}</h4></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { Icon: Activity, color: 'var(--primary-blue)', bg: 'rgba(52,152,219,0.06)', label: t('profile.totalRecordsLogged'), value: stats.totalRecords },
                { Icon: Scale, color: '#9B59B6', bg: 'rgba(155,89,182,0.06)', label: t('profile.totalWasteLogged'), value: `${stats.totalWeight} ${t('common.kg')}` },
                { Icon: CheckCircle, color: 'var(--green-success)', bg: 'rgba(46,204,113,0.06)', label: t('profile.complianceRate'), value: `${stats.complianceRate}%` },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: s.bg, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}><s.Icon size={15} color={s.color} /><span>{s.label}</span></div>
                  <strong style={{ color: s.color }}>{loading ? '...' : s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><UserCircle size={18} /> {t('profile.accountInfo')}</h3>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
              {[
                { label: t('profile.fullName'), value: user.name },
                { label: t('common.username'), value: user.username },
                { label: t('profile.emailAddress'), value: user.email },
                { label: t('profile.roleDepartment'), value: `${t('roles.medicalStaff')} / ${user.department || '—'}` },
                { label: t('profile.accountStatus'), isStatus: true },
                { label: t('profile.systemAccess'), value: t('profile.staffAccess') },
              ].map(({ label, value, isStatus }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {isStatus ? <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>● {t('common.active')}</span>
                      : <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-dark)', wordBreak: 'break-word' }}>{value || '—'}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <EditProfileCard onUpdated={(u) => setUser(prev => ({ ...prev, ...u }))} />

          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}><Shield size={18} /> {t('profile.rolePermissions')}</h3>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
              {permissions.map(({ label, granted }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: granted ? 'rgba(39,174,96,0.06)' : 'rgba(231,76,60,0.05)', fontSize: '0.85rem' }}>
                  <span style={{ color: granted ? 'var(--green-success)' : '#E74C3C', fontSize: '1rem' }}>{granted ? '✓' : '✗'}</span>
                  <span style={{ color: granted ? 'var(--text-dark)' : 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <SecurityCard />
        </div>
      </div>
    </div>
  );
};

export default StaffProfilePage;
