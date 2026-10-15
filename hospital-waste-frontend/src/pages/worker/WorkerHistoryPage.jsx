import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle, ShieldCheck, AlertTriangle, Download } from 'lucide-react';
import { api, session } from '../../services/api';
import { useT } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { formatISTDateTime } from '../../utils/dateUtils';
import { CATEGORIES, binClass, downloadCsv, hasMismatch } from '../../utils/waste';

const PAGE_SIZE = 15;

const WorkerHistoryPage = () => {
  const t = useT();
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [page, setPage] = useState(1);

  const currentUser = session.getUser() || {};

  // Fetch once (server scopes to the logged-in worker); filter client-side for instant feedback
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setHistory(await api.getCollectionHistory({ workerName: currentUser.name, workerId: currentUser.id }));
    } catch (err) {
      if (err.status !== 401) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.name, currentUser.id, toast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { setPage(1); }, [search, selectedCategory, selectedRoom]);

  const rooms = [...new Set(history.map(r => r.room).filter(Boolean))].sort();
  const q = search.trim().toLowerCase();
  const filtered = history.filter(item =>
    (!q || item.recordId?.toLowerCase().includes(q) || item.room?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)) &&
    (!selectedCategory || item.category === selectedCategory) &&
    (!selectedRoom || item.room === selectedRoom)
  );
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    if (filtered.length === 0) { toast.info(t('admin.noExport')); return; }
    downloadCsv(
      `Collection_History_${(currentUser.username || 'worker')}_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Record ID', 'Room', 'Category', 'Weight (kg)', 'Assigned Bin', 'Collected At', 'Disposed At', 'Bin Verified', 'Mismatch Note'],
      filtered.map(r => [r.recordId, r.room, r.category, r.weight, r.assignedBin, formatISTDateTime(r.collectedAt), formatISTDateTime(r.completedAt || r.collectedAt), hasMismatch(r) ? 'No' : 'Yes', r.binMismatchNote || ''])
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('worker.historyTitle')}</h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)' }}>{t('worker.historySubtitle', { name: currentUser.name || t('roles.sanitationWorker') })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={exportCsv}><Download size={15} /> {t('common.exportCsv')}</button>
          <button id="btn-refresh-history" className="btn btn-outline" onClick={fetchHistory} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t('worker.refreshHistory')}
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div className="grid grid-cols-4" style={{ gap: '1rem', alignItems: 'center' }}>
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input id="history-search-input" type="text" className="form-control" style={{ paddingLeft: '2.5rem' }} placeholder={t('worker.historySearch')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select id="history-category-filter" className="form-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="">{t('common.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
          <select id="history-room-filter" className="form-control" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
            <option value="">{t('common.allRooms')}</option>
            {rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table style={{ width: '100%', minWidth: '850px' }}>
            <thead>
              <tr>
                <th>{t('common.recordId')}</th>
                <th>{t('worker.roomLocation')}</th>
                <th>{t('worker.wasteCategory')}</th>
                <th>{t('common.weight')}</th>
                <th>{t('common.assignedBin')}</th>
                <th>{t('common.collectedAt')}</th>
                <th>{t('common.disposedAt')}</th>
                <th>{t('worker.verificationNote')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('worker.loadingHistory')}</td></tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <CheckCircle size={32} color="#10B981" style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                    <strong style={{ display: 'block', color: '#334155', marginBottom: '0.25rem' }}>{t('worker.noHistory')}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('worker.noHistorySub')}</span>
                  </td>
                </tr>
              ) : (
                pageItems.map(item => (
                  <tr key={item._id || item.recordId}>
                    <td><strong>{item.recordId}</strong></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{item.room}</span></td>
                    <td style={{ fontSize: '0.88rem' }}>{t(`categories.${item.category}`)}</td>
                    <td>{item.weight} {t('common.kg')}</td>
                    <td><span className={binClass(item.assignedBin)}>{t(`bins.${item.assignedBin}`)}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{formatISTDateTime(item.collectedAt)}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <span style={{ color: item.completedAt ? '#059669' : 'var(--text-muted)', fontWeight: item.completedAt ? 600 : 400 }}>{formatISTDateTime(item.completedAt || item.collectedAt)}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {hasMismatch(item) ? (
                        <span style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}><AlertTriangle size={13} /> {item.binMismatchNote || t('admin.mismatch')}</span>
                      ) : item.binVerified ? (
                        <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><ShieldCheck size={13} /> {t('worker.verifiedMatch')}</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>{t('worker.standard')}</span>
                      )}
                    </td>
                    <td><span className="badge badge-success"><CheckCircle size={13} /> {t('statuses.Disposed')}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </div>
    </div>
  );
};

export default WorkerHistoryPage;
