import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, Clock, Bell, RefreshCw, X,
  AlertTriangle, Calendar, Search, ChevronRight,
  Package, Shield, Eye, ClipboardList, ShieldCheck
} from 'lucide-react';
import WasteChatbot from '../../components/WasteChatbot';
import NotificationBell from '../../components/NotificationBell';
import Pagination from '../../components/Pagination';
import { TaskDetailsModal, BinVerifyModal } from '../../components/WorkerTaskModals';
import useWorkerTasks from '../../hooks/useWorkerTasks';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTodayISTDateString, formatISTDateTime, calculateOverdueInfo, isTodayInIST } from '../../utils/dateUtils';
import { binClass, isActive, isDone, isCancelled, hasMismatch, BINS, BIN_COLORS, CATEGORIES } from '../../utils/waste';

const PAGE_SIZE = 10;
const PROTOCOL_STYLES = {
  Yellow: { bg: '#FFFBEB', num: '#B45309', title: '#92400E', text: '#78350F' },
  Red: { bg: '#FEF2F2', num: '#DC2626', title: '#B91C1C', text: '#991B1B' },
  White: { bg: '#F8FAFC', num: '#475569', title: '#334155', text: '#475569' },
  Blue: { bg: '#EFF6FF', num: '#1D4ED8', title: '#1E40AF', text: '#1E3A8A' },
  Green: { bg: '#ECFDF5', num: '#047857', title: '#065F46', text: '#064E3B' }
};

const WorkerDashboardPage = () => {
  const { t, lang } = useLanguage();
  const {
    records, stats, loading, actionLoading, loadData,
    selectedTask, setSelectedTask, binVerifyRecord, setBinVerifyRecord,
    handleCollect, handleStartDispose, confirmDisposal
  } = useWorkerTasks();

  const [alertDismissed, setAlertDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProtocol, setShowProtocol] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [activeTab, filterDate, filterRoom, filterCategory, searchTerm]);

  // Click on a notification opens that task directly
  const handleNotificationSelectTask = (notif) => {
    if (!notif.recordId) return;
    setSearchTerm(notif.recordId);
    setActiveTab('all');
    setFilterDate('');
    const target = records.find(r => r.recordId === notif.recordId);
    if (target) setSelectedTask(target);
  };

  // ─── Derived Record Splits ────────────────────────────────────────────────
  const liveRecords = records.filter(r => !isCancelled(r));
  const todayAssignedRecords = liveRecords.filter(r => isTodayInIST(r.assignedTime || r.createdAt));
  const overduePendingRecords = liveRecords.filter(r => isActive(r) && (!isTodayInIST(r.createdAt) || calculateOverdueInfo(r.assignedTime || r.createdAt, 120).isOverdue));
  const pendingRecords = liveRecords.filter(isActive);
  const collectedRecords = liveRecords.filter(r => r.status === 'Collected');
  const completedRecords = liveRecords.filter(isDone);
  const uniqueRooms = [...new Set(liveRecords.map(r => r.room).filter(Boolean))].sort();

  const tabRecords = activeTab === 'today' ? todayAssignedRecords
    : activeTab === 'overdue' ? overduePendingRecords
    : activeTab === 'pending' ? pendingRecords
    : activeTab === 'collected' ? collectedRecords
    : activeTab === 'completed' ? completedRecords
    : liveRecords;

  const term = searchTerm.toLowerCase();
  const filteredRecords = tabRecords.filter(r => {
    if (filterRoom && r.room !== filterRoom) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterDate && getTodayISTDateString(r.assignedTime || r.createdAt) !== filterDate) return false;
    if (term && !(r.recordId || '').toLowerCase().includes(term) && !(r.room || '').toLowerCase().includes(term) && !(r.description || '').toLowerCase().includes(term)) return false;
    return true;
  });
  const pageRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = filterDate || filterRoom || filterCategory || searchTerm;

  const getStatusBadge = (status) => {
    if (isActive({ status })) return <span className="badge badge-warning"><Clock size={12} /> {t('statuses.Pending')}</span>;
    if (status === 'Collected') return <span className="badge badge-info"><Package size={12} /> {t('statuses.Collected')}</span>;
    if (isDone({ status })) return <span className="badge badge-success"><CheckCircle size={12} /> {t('statuses.Disposed')}</span>;
    return <span className="badge badge-neutral">{t(`statuses.${status}`)}</span>;
  };

  const tabs = [
    { key: 'all', label: t('worker.tabAll'), count: liveRecords.length, color: '#2563EB', bg: '#EFF6FF', icon: <ClipboardList size={15} /> },
    { key: 'today', label: t('worker.tabToday'), count: todayAssignedRecords.length, color: '#0284C7', bg: '#F0F9FF', icon: <Calendar size={15} /> },
    { key: 'overdue', label: t('worker.tabOverdue'), count: overduePendingRecords.length, color: '#DC2626', bg: '#FEF2F2', icon: <AlertTriangle size={15} /> },
    { key: 'pending', label: t('worker.tabPending'), count: pendingRecords.length, color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={15} /> },
    { key: 'collected', label: t('worker.tabCollected'), count: collectedRecords.length, color: '#059669', bg: '#ECFDF5', icon: <Package size={15} /> },
    { key: 'completed', label: t('worker.tabCompleted'), count: completedRecords.length, color: '#10B981', bg: '#F0FDF4', icon: <CheckCircle size={15} /> },
  ];

  const statCards = [
    { icon: <ClipboardList size={24} color="#2563EB" />, label: t('worker.todayAssigned'), value: stats.todayAssignedPickups ?? todayAssignedRecords.length, bg: '#EFF6FF' },
    { icon: <Clock size={24} color="#F59E0B" />, label: t('worker.pendingCollections'), value: stats.pendingCollections ?? pendingRecords.length, bg: '#FFFBEB' },
    { icon: <Package size={24} color="#059669" />, label: t('worker.collectedReady'), value: stats.collectedCollections ?? collectedRecords.length, bg: '#ECFDF5' },
    { icon: <CheckCircle size={24} color="#10B981" />, label: t('worker.completedDisposals'), value: stats.completedDisposals ?? completedRecords.length, bg: '#F0FDF4' },
  ];

  const latestPending = stats.recentNotifications && stats.recentNotifications[0];

  return (
    <div className="fade-in">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('common.hospital')} — {t('worker.title')}</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('worker.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <NotificationBell onSelectTask={handleNotificationSelectTask} />
          <div className="badge badge-warning" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Truck size={16} /> {t('worker.role')}</div>
        </div>
      </div>

      {/* ── Alert Banner (dismissable) ─────────────────────────────────────── */}
      {!alertDismissed && latestPending && (
        <div style={{ backgroundColor: 'rgba(241,196,15,0.15)', borderLeft: '4px solid var(--yellow-bin)', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={20} color="#B7950B" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#B7950B', fontSize: '0.9rem' }}>{t('worker.alertTitle')}</strong>
              <p style={{ fontSize: '0.8rem', color: '#7D6608', margin: '0.1rem 0 0 0' }}>
                {t('worker.alertBody', { count: stats.recentNotifications.length, room: latestPending.room, cat: t(`categories.${latestPending.category}`) })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" style={{ borderColor: '#B7950B', color: '#B7950B' }} onClick={() => { setSelectedTask(latestPending); setAlertDismissed(true); }}>{t('worker.viewRequest')}</button>
            <button onClick={() => setAlertDismissed(true)} aria-label={t('common.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B7950B', padding: '4px', display: 'flex' }}><X size={18} /></button>
          </div>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gap: '1rem' }}>
        {statCards.map((card, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-icon" style={{ backgroundColor: card.bg }}>{card.icon}</div>
            <div className="stat-details">
              <h4>{card.label}</h4>
              <div className="value">{loading ? '...' : card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Table + Chatbot ─────────────────────────────────────── */}
      <div className="worker-main-grid">
        <div className="card" style={{ minWidth: 0, padding: 0, overflow: 'hidden' }}>
          {/* Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setFilterDate(tab.key === 'today' ? getTodayISTDateString() : ''); }}
                style={{ flex: 1, padding: '0.75rem 0.6rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? tab.color : '#64748B', backgroundColor: activeTab === tab.key ? tab.bg : 'transparent', borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >
                {tab.icon}<span>{tab.label}</span>
                <span style={{ backgroundColor: tab.color, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '1px 6px', borderRadius: '12px', minWidth: '20px', textAlign: 'center' }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input id="worker-search-input" type="text" className="form-control" placeholder={t('worker.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '0.35rem 0.6rem 0.35rem 2.2rem', fontSize: '0.82rem' }} />
            </div>
            <input id="worker-date-filter" type="date" className="form-control" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }} />
            <select id="worker-room-filter" className="form-control" value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} style={{ width: 'auto', padding: '0.35rem 2rem 0.35rem 0.6rem', fontSize: '0.82rem' }}>
              <option value="">{t('common.allRooms')}</option>
              {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select id="worker-category-filter" className="form-control" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ width: 'auto', padding: '0.35rem 2rem 0.35rem 0.6rem', fontSize: '0.82rem' }}>
              <option value="">{t('common.allCategories')}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
            </select>
            {hasFilters && (
              <button className="btn btn-danger btn-sm" onClick={() => { setFilterDate(''); setFilterRoom(''); setFilterCategory(''); setSearchTerm(''); }}>✕ {t('common.clear')}</button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <button id="btn-refresh-worker-dashboard" className="btn btn-outline btn-sm" onClick={loadData} disabled={loading}><RefreshCw size={13} className={loading ? 'spin' : ''} /> {t('common.refresh')}</button>
            </div>
          </div>

          {/* Assigned Collection Tasks Table */}
          <div className="table-container">
            <table style={{ width: '100%', minWidth: '820px' }}>
              <thead>
                <tr>
                  <th>{t('common.recordId')}</th>
                  <th>{t('common.room')}</th>
                  <th>{t('worker.wasteCategory')}</th>
                  <th>{t('common.weight')}</th>
                  <th>{t('common.assignedBin')}</th>
                  <th>{t('worker.assignedTime')}</th>
                  <th>{t('worker.currentStatus')}</th>
                  <th style={{ textAlign: 'right' }}>{t('worker.availableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>{t('worker.loading')}</td></tr>
                ) : pageRecords.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <CheckCircle size={26} color="var(--green-success)" style={{ display: 'block', margin: '0 auto 0.4rem' }} />
                    <strong style={{ display: 'block', color: '#1E293B', marginBottom: '0.2rem' }}>{t('worker.noTasks')}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('worker.noRecordsTab')}</span>
                  </td></tr>
                ) : pageRecords.map(req => {
                  const overdue = isActive(req) ? calculateOverdueInfo(req.assignedTime || req.createdAt, 120) : null;
                  const showOverdue = overdue && (overdue.isOverdue || !isTodayInIST(req.createdAt));
                  return (
                    <tr key={req._id || req.recordId}>
                      <td>
                        <strong>{req.recordId}</strong>
                        {showOverdue && <span style={{ display: 'block', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, marginTop: '2px' }}>⚠ {overdue.durationStr || t('common.overdue')}</span>}
                      </td>
                      <td>
                        <button onClick={() => setSelectedTask(req)} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}>{req.room}</button>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{t(`categories.${req.category}`)}</td>
                      <td style={{ fontWeight: 600 }}>{req.weight} {t('common.kg')}</td>
                      <td><span className={binClass(req.assignedBin)}>{t(`bins.${req.assignedBin}`)}</span></td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{formatISTDateTime(req.assignedTime || req.createdAt)}</td>
                      <td>
                        {getStatusBadge(req.status)}
                        {hasMismatch(req) && <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '2px', fontWeight: 600 }}>⚠ {req.binMismatchNote || t('admin.mismatch')}</div>}
                        {!req.binMismatchNote && req.binVerified && <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>✓ {t('common.verified')}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isActive(req) && (
                            <button id={`btn-collect-${req.recordId}`} className="btn btn-primary btn-sm" onClick={() => handleCollect(req)} disabled={actionLoading}><Package size={13} /> {t('worker.collect')}</button>
                          )}
                          {req.status === 'Collected' && (
                            <button id={`btn-dispose-${req.recordId}`} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }} onClick={() => handleStartDispose(req)} disabled={actionLoading}><ShieldCheck size={13} /> {t('worker.dispose')}</button>
                          )}
                          {isDone(req) && (
                            <>
                              <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={13} /> {t('worker.disposedDone')}</span>
                              <button className="btn btn-outline btn-sm" style={{ padding: '0.22rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setSelectedTask(req)}><Eye size={12} /> {t('common.view')}</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filteredRecords.length} onChange={setPage} />
        </div>

        {/* ── Right Sidebar: AI Chatbot ───────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <WasteChatbot role="worker" lang={lang} />
        </div>
      </div>

      {/* ── Verification Protocol (collapsible) ─── */}
      <div style={{ marginTop: '1.5rem' }}>
        <div
          onClick={() => setShowProtocol(prev => !prev)}
          id="verification-protocol-card"
          role="button"
          tabIndex={0}
          aria-expanded={showProtocol}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProtocol(prev => !prev); } }}
          style={{ cursor: 'pointer', backgroundColor: '#FFFFFF', border: '2px solid #E2E8F0', borderRadius: showProtocol ? '12px 12px 0 0' : '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', userSelect: 'none', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={22} color="#2563EB" /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>{t('worker.verificationProtocol')}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{showProtocol ? t('worker.touchToClose') : t('worker.touchToOpen')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '0.4rem 0.85rem', borderRadius: '20px' }}>
            <span>{showProtocol ? t('common.close') : t('common.view')}</span>
            <ChevronRight size={16} style={{ transform: showProtocol ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {showProtocol && (
          <div id="verification-protocol-details" className="fade-in" style={{ backgroundColor: '#FFFFFF', border: '2px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.92rem' }}>
              {BINS.map((bin, i) => {
                const s = PROTOCOL_STYLES[bin];
                return (
                  <div key={bin} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0.65rem 0.85rem', backgroundColor: s.bg, borderRadius: '8px', borderLeft: `4px solid ${BIN_COLORS[bin]}` }}>
                    <span style={{ fontWeight: 800, color: s.num, minWidth: '20px' }}>{i + 1}.</span>
                    <div><strong style={{ color: s.title }}>{t(`bins.${bin}`)}:</strong> <span style={{ color: s.text }}>{t(`worker.protocol.${bin}`)}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onCollect={handleCollect} onDispose={handleStartDispose} busy={actionLoading} />
      <BinVerifyModal record={binVerifyRecord} onClose={() => setBinVerifyRecord(null)} onConfirm={confirmDisposal} busy={actionLoading} />
    </div>
  );
};

export default WorkerDashboardPage;
