import React, { useEffect, useState } from 'react';
import { User, Package, Calendar, Scale } from 'lucide-react';
import { api, session } from '../../services/api';
import { useT } from '../../i18n/LanguageContext';
import { IdentityCard, SecurityCard, EditProfileCard } from '../../components/ProfilePanel';

const WorkerProfilePage = () => {
  const t = useT();
  const [user, setUser] = useState(session.getUser() || {});
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, s] = await Promise.all([api.me().catch(() => null), api.getWorkerStats(user.name, user.id)]);
        if (cancelled) return;
        if (me?.user) { session.updateUser(me.user); setUser(me.user); }
        setStats(s);
      } catch (err) {
        if (err.status !== 401) console.warn('Failed to load worker stats:', err.message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('profile.title')}</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('worker.profileSubtitle')}</p>
        </div>
      </div>

      <div className="profile-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <IdentityCard user={user} roleLabel={t('roles.sanitationWorker')} />
          <div className="card">
            <div className="card-header"><h4 style={{ margin: 0, fontSize: '0.9rem' }}>{t('profile.activityStats')}</h4></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { Icon: Package, color: '#059669', bg: 'rgba(5,150,105,0.06)', label: t('worker.totalCollections'), value: stats?.userTotalCollections },
                { Icon: Calendar, color: 'var(--primary-blue)', bg: 'rgba(52,152,219,0.06)', label: t('worker.collectionsToday'), value: stats?.todayCollections },
                { Icon: Scale, color: '#9B59B6', bg: 'rgba(155,89,182,0.06)', label: t('worker.weightToday'), value: stats ? `${stats.todayWeightCollected} ${t('common.kg')}` : undefined },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', backgroundColor: s.bg, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}><s.Icon size={15} color={s.color} /><span>{s.label}</span></div>
                  <strong style={{ color: s.color }}>{s.value === undefined ? '...' : s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} /> {t('profile.accountInfo')}</h3>
            </div>
            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
              {[
                { label: t('profile.fullName'), value: user.name },
                { label: t('worker.employeeUsername'), value: user.username, mono: true },
                { label: t('profile.emailAddress'), value: user.email },
                { label: t('profile.phoneNumber'), value: user.phone },
                { label: t('worker.systemRole'), value: t('worker.workerSystemRole'), accent: true },
                { label: t('worker.departmentHospital'), value: user.department },
              ].map(({ label, value, mono, accent }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <p style={{ margin: '0.25rem 0 0', fontWeight: 600, fontSize: '0.9rem', color: accent ? 'var(--yellow-bin)' : 'var(--text-dark)', wordBreak: 'break-word' }}>
                    {mono ? <code>{value || '—'}</code> : (value || '—')}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <EditProfileCard onUpdated={(u) => setUser(prev => ({ ...prev, ...u }))} />
          <SecurityCard />
        </div>
      </div>
    </div>
  );
};

export default WorkerProfilePage;
