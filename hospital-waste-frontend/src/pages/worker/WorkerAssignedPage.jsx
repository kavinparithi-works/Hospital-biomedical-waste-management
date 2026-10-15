import React, { useState, useEffect } from 'react';
import { ClipboardList, Package, Clock, CheckCircle, ShieldCheck, RefreshCw, Search } from 'lucide-react';
import { useT } from '../../i18n/LanguageContext';
import { formatISTDateTime, calculateOverdueInfo, isTodayInIST } from '../../utils/dateUtils';
import { binClass, isActive, isDone, CATEGORIES } from '../../utils/waste';
import { TaskDetailsModal, BinVerifyModal } from '../../components/WorkerTaskModals';
import Pagination from '../../components/Pagination';
import useWorkerTasks from '../../hooks/useWorkerTasks';

const PAGE_SIZE = 12;

const WorkerAssignedPage = () => {
  const t = useT();
  const {
    currentUser, records, stats, loading, actionLoading, loadData,
    selectedTask, setSelectedTask, binVerifyRecord, setBinVerifyRecord,
    handleCollect, handleStartDispose, confirmDisposal
  } = useWorkerTasks();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'collected'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter, roomFilter]);

  // Active tasks only (Pending/Assigned/Collected)
  const activeAssignedRecords = records.filter(r => isActive(r) || r.status === 'Collected');
  const q = search.toLowerCase();
  const filteredTasks = activeAssignedRecords.filter(r => {
    if (statusFilter === 'pending' && !isActive(r)) return false;
    if (statusFilter === 'collected' && r.status !== 'Collected') return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (roomFilter && r.room !== roomFilter) return false;
    if (q && !(r.recordId || '').toLowerCase().includes(q) && !(r.room || '').toLowerCase().includes(q) && !(r.description || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const pageTasks = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueRooms = [...new Set(activeAssignedRecords.map(r => r.room).filter(Boolean))].sort();
  const hasFilters = search || statusFilter !== 'all' || roomFilter || categoryFilter;

  const metrics = [
    { label: t('worker.assignedToday'), value: stats.todayAssignedPickups ?? records.filter(r => isTodayInIST(r.assignedTime || r.createdAt)).length, Icon: ClipboardList, color: '#2563EB', bg: '#EFF6FF' },
    { label: t('worker.pendingPickups'), value: stats.pendingCollections ?? records.filter(isActive).length, Icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
    { label: t('worker.collectedReady'), value: records.filter(r => r.status === 'Collected').length, Icon: Package, color: '#059669', bg: '#ECFDF5' },
    { label: t('worker.completedDisposals'), value: stats.completedDisposals ?? records.filter(isDone).length, Icon: CheckCircle, color: '#10B981', bg: '#F0FDF4' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={26} color="var(--primary-blue)" /> {t('worker.assignedTitle')}</h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('worker.assignedSubtitle', { name: currentUser.name || t('common.worker') })}</p>
        </div>
        <button id="btn-refresh-assigned" className="btn btn-outline" onClick={loadData} disabled={loading || actionLoading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> {t('worker.refreshCollections')}
        </button>
      </div>

      <div className="kpi-grid" style={{ gap: '1rem' }}>
        {metrics.map(m => (
          <div key={m.label} className="card stat-card" style={{ borderLeft: `4px solid ${m.color}` }}>
            <div className="stat-icon" style={{ backgroundColor: m.bg }}><m.Icon size={22} color={m.color} /></div>
            <div className="stat-details">
              <h4>{m.label}</h4>
              <div className="value">{loading ? '...' : m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input id="assigned-search-input" type="text" className="form-control" style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }} placeholder={t('worker.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select id="assigned-status-filter" className="form-control" style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">{t('worker.allActive')}</option>
            <option value="pending">{t('worker.pendingOnly')}</option>
            <option value="collected">{t('worker.collectedOnly')}</option>
          </select>
          <select id="assigned-room-filter" className="form-control" style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem' }} value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
            <option value="">{t('common.allRooms')}</option>
            {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select id="assigned-category-filter" className="form-control" style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">{t('common.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
          {hasFilters && (
            <button className="btn btn-danger btn-sm" onClick={() => { setSearch(''); setStatusFilter('all'); setRoomFilter(''); setCategoryFilter(''); }}>✕ {t('common.clear')}</button>
          )}
        </div>
      </div>

      {/* Assigned Collection Tasks Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t('worker.collectionTasks')}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('worker.showingTasks', { n: filteredTasks.length })}</span>
        </div>

        <div className="table-container">
          <table style={{ width: '100%', minWidth: '850px' }}>
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
              ) : pageTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    <CheckCircle size={32} color="#10B981" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                    <strong style={{ display: 'block', color: '#1E293B', marginBottom: '0.25rem' }}>{t('worker.noActive')}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('worker.noActiveSub')}</span>
                  </td>
                </tr>
              ) : pageTasks.map(task => {
                const overdue = isActive(task) ? calculateOverdueInfo(task.assignedTime || task.createdAt, 120) : null;
                const showOverdue = overdue && (overdue.isOverdue || !isTodayInIST(task.createdAt));
                return (
                  <tr key={task._id || task.recordId}>
                    <td>
                      <strong>{task.recordId}</strong>
                      {showOverdue && <span style={{ display: 'block', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, marginTop: '2px' }}>⚠ {overdue.durationStr || t('common.overdue')}</span>}
                    </td>
                    <td>
                      <button onClick={() => setSelectedTask(task)} style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}>{task.room}</button>
                    </td>
                    <td style={{ fontSize: '0.86rem' }}>{t(`categories.${task.category}`)}</td>
                    <td style={{ fontWeight: 600 }}>{task.weight} {t('common.kg')}</td>
                    <td><span className={binClass(task.assignedBin)}>{t(`bins.${task.assignedBin}`)}</span></td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>{formatISTDateTime(task.assignedTime || task.createdAt)}</td>
                    <td>
                      {isActive(task) && <span className="badge badge-warning"><Clock size={12} /> {t('statuses.Pending')}</span>}
                      {task.status === 'Collected' && <span className="badge badge-info"><Package size={12} /> {t('statuses.Collected')}</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {isActive(task) && (
                          <button id={`btn-collect-${task.recordId}`} className="btn btn-primary btn-sm" onClick={() => handleCollect(task)} disabled={actionLoading}>
                            <Package size={13} /> {t('worker.collect')}
                          </button>
                        )}
                        {task.status === 'Collected' && (
                          <button id={`btn-dispose-${task.recordId}`} className="btn btn-primary btn-sm" style={{ backgroundColor: '#059669', borderColor: '#059669' }} onClick={() => handleStartDispose(task)} disabled={actionLoading}>
                            <ShieldCheck size={13} /> {t('worker.dispose')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={filteredTasks.length} onChange={setPage} />
      </div>

      <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} onCollect={handleCollect} onDispose={handleStartDispose} busy={actionLoading} />
      <BinVerifyModal record={binVerifyRecord} onClose={() => setBinVerifyRecord(null)} onConfirm={confirmDisposal} busy={actionLoading} />
    </div>
  );
};

export default WorkerAssignedPage;
