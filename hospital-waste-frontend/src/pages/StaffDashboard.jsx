import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, CheckCircle, RefreshCw, Calendar, 
  Clock, Scale, ShieldCheck, Search, Filter, ArrowLeft,
  AlertTriangle, Truck, Send, UserCheck, Download, XCircle, X, Info
} from 'lucide-react';
import WasteChatbot from '../components/WasteChatbot';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import { api } from '../services/api';
import StaffProfilePage from './StaffProfilePage';
import { useLanguage } from '../i18n/LanguageContext';
import { useToast } from '../components/Toast';
import { 
  isTodayInIST, 
  formatISTDate, 
  formatISTTime, 
  formatISTDateTime, 
  calculateOverdueInfo 
} from '../utils/dateUtils';
import { CATEGORIES, BINS, CATEGORY_BIN_MAP, isCompliant, hasMismatch, isActive, isDone, isCancelled, statusBadgeClass, binClass, downloadCsv } from '../utils/waste';

const PAGE_SIZE = 15;

const StaffDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const toast = useToast();

  const isHistoryView = location.pathname.includes('/history');
  const isAddWasteView = location.pathname.includes('/add-waste');
  const isProfileView = location.pathname.includes('/profile');

  const [allRecords, setAllRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active view tab in main dashboard: 'today' | 'overdue' | 'all'
  const [dashboardTab, setDashboardTab] = useState('today');
  const [dashboardPage, setDashboardPage] = useState(1);

  // Form Fields
  const [description, setDescription] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('Infectious Waste');
  const [weight, setWeight] = useState('');
  const [assignedBin, setAssignedBin] = useState('Yellow');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Reminder feedback state: { [recordId]: { status: 'sending'|'sent'|'error', msg: string } }
  const [reminderState, setReminderState] = useState({});

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // History View Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  const roomOptions = ['Room 203', 'Room 101', 'Room 105', 'ICU', 'Emergency', 'Laboratory', 'Operation Theatre', 'Pharmacy Store', 'Pediatrics Ward'];
  const tc = (c) => t(`categories.${c}`);
  const tb = (b) => t(`bins.${b}`);
  const ts = (s) => t(`statuses.${s}`);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setAllRecords(await api.getWasteRecords());
    } catch (err) {
      if (err.status !== 401) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchWorkers = useCallback(async () => {
    try {
      const workerList = await api.getActiveWorkers();
      setWorkers(workerList || []);
      setSelectedWorkerId(prev => prev || (workerList && workerList[0] ? workerList[0]._id : ''));
    } catch (err) {
      if (err.status !== 401) console.warn('Failed to load workers:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchWorkers();
  }, [location.pathname, fetchRecords, fetchWorkers]);

  // Reset pagination whenever the visible set changes
  useEffect(() => { setDashboardPage(1); }, [dashboardTab]);
  useEffect(() => { setHistoryPage(1); }, [historySearch, historyCategoryFilter, historyStatusFilter]);

  // Keep the bin in sync with the statutory mapping when the category changes
  const handleCategoryChange = (value) => {
    setCategory(value);
    if (CATEGORY_BIN_MAP[value]) setAssignedBin(CATEGORY_BIN_MAP[value]);
  };

  // Called by chatbot when it identifies waste — auto-fills the form
  const handleAISuggestion = (suggestion) => {
    if (!suggestion) return;
    const typeMap = {
      'Sharps': 'Sharps',
      'Sharps & Cutters': 'Sharps',
      'Infectious / Soiled Waste': 'Infectious Waste',
      'Infectious Waste': 'Infectious Waste',
      'Contaminated Recyclable': 'Contaminated Recyclable',
      'Contaminated Recyclable Plastics': 'Contaminated Recyclable',
      'Glassware & Implants': 'Glassware & Metallic Implants',
      'Glassware & Metallic Implants': 'Glassware & Metallic Implants',
      'General Non-Hazardous Waste': 'General Waste',
      'General Waste': 'General Waste',
      'Chemical & Pharmaceutical Waste': 'Chemical Waste',
      'Chemical Waste': 'Chemical Waste',
    };
    const mapped = typeMap[suggestion.type] || (CATEGORIES.includes(suggestion.type) ? suggestion.type : null);
    const bin = suggestion.bin ? suggestion.bin.split(' ')[0] : null;
    if (mapped) setCategory(mapped);
    if (bin && BINS.includes(bin)) setAssignedBin(bin);
    else if (mapped) setAssignedBin(CATEGORY_BIN_MAP[mapped]);
    if (mapped) toast.info(t('staff.aiFilled', { category: tc(mapped), bin: tb(bin && BINS.includes(bin) ? bin : CATEGORY_BIN_MAP[mapped]) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!room.trim() || !category || !weight || !assignedBin) {
      setErrorMsg(t('staff.requiredFields'));
      return;
    }
    try {
      setSubmitting(true);
      const assignedWorker = workers.find(w => w._id === selectedWorkerId);
      const newRecord = await api.createWasteRecord({
        description, 
        room: room.trim(), 
        category,
        weight: Number(weight),
        assignedBin,
        assignedTo: assignedWorker ? assignedWorker.name : '',
        assignedToUserId: assignedWorker ? assignedWorker._id : ''
      });
      const msg = t('staff.successLogged', { id: newRecord.record.recordId, worker: assignedWorker ? assignedWorker.name : t('common.unassigned') });
      setSuccessMsg(msg);
      toast.success(msg);
      setDescription('');
      setWeight('');
      await fetchRecords();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Sends Overdue Reminder to Worker
  const handleSendReminder = async (record) => {
    const clearLater = (ms) => setTimeout(() => {
      setReminderState(prev => { const next = { ...prev }; delete next[record.recordId]; return next; });
    }, ms);
    try {
      setReminderState(prev => ({ ...prev, [record.recordId]: { status: 'sending', msg: t('staff.sending') } }));
      await api.sendWasteReminder({ wasteRecordId: record._id, recordId: record.recordId, cooldownSeconds: 60 });
      setReminderState(prev => ({ ...prev, [record.recordId]: { status: 'sent', msg: t('staff.reminderSent', { name: record.assignedTo || t('common.worker') }) } }));
      await fetchRecords();
      clearLater(6000);
    } catch (err) {
      toast.error(err.message);
      setReminderState(prev => ({ ...prev, [record.recordId]: { status: 'error', msg: err.message } }));
      clearLater(4000);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      await api.cancelWasteRecord(cancelTarget._id, cancelReason);
      toast.success(t('staff.recordCancelled', { id: cancelTarget.recordId }));
      setCancelTarget(null);
      setCancelReason('');
      await fetchRecords();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  // ── Metrics Calculation (Single Source of Truth) ──────────────────────────
  const liveRecords = allRecords.filter(r => !isCancelled(r));
  const recordsCreatedToday = liveRecords.filter(r => isTodayInIST(r.createdAt));
  const totalTodayWeight = recordsCreatedToday.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const pendingCount = liveRecords.filter(isActive).length;
  const collectedCount = liveRecords.filter(r => r.status === 'Collected').length;
  const disposedTodayCount = liveRecords.filter(r => isDone(r) && isTodayInIST(r.completedAt || r.disposedAt || r.updatedAt)).length;
  const compliantCount = recordsCreatedToday.filter(r => isCompliant(r.category, r.assignedBin)).length;
  const todayComplianceRate = recordsCreatedToday.length > 0 ? Math.round((compliantCount / recordsCreatedToday.length) * 100) : 100;

  const overdueRecords = liveRecords.filter(r => {
    if (!isActive(r)) return false;
    const isPastDay = !isTodayInIST(r.createdAt);
    const { isOverdue } = calculateOverdueInfo(r.assignedTime || r.createdAt, 120);
    return isPastDay || isOverdue;
  });

  const filteredHistory = allRecords.filter(record => {
    const q = historySearch.toLowerCase();
    const matchesSearch = !q ||
      record.recordId?.toLowerCase().includes(q) ||
      record.room?.toLowerCase().includes(q) ||
      record.description?.toLowerCase().includes(q) ||
      record.assignedTo?.toLowerCase().includes(q) ||
      record.createdBy?.toLowerCase().includes(q);
    const matchesCategory = historyCategoryFilter === 'all' || record.category === historyCategoryFilter;
    const matchesStatus = historyStatusFilter === 'all' ||
      (historyStatusFilter === 'active' && isActive(record)) ||
      (historyStatusFilter === 'collected' && record.status === 'Collected') ||
      (historyStatusFilter === 'done' && isDone(record)) ||
      (historyStatusFilter === 'cancelled' && isCancelled(record));
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const exportHistory = () => {
    if (filteredHistory.length === 0) { toast.info(t('admin.noExport')); return; }
    downloadCsv(
      `KMCH_Waste_History_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Record ID', 'Created (IST)', 'Room', 'Category', 'Weight (kg)', 'Assigned Bin', 'Assigned Worker', 'Collected By', 'Collected At', 'Completed At', 'Status', 'Compliance', 'Bin Verified', 'Mismatch Note', 'Logged By'],
      filteredHistory.map(r => [
        r.recordId, formatISTDateTime(r.createdAt), r.room, r.category, r.weight, r.assignedBin, r.assignedTo || '', r.collectedBy || '',
        r.collectedAt ? formatISTDateTime(r.collectedAt) : '', r.completedAt ? formatISTDateTime(r.completedAt) : '', r.status,
        isCompliant(r.category, r.assignedBin) ? 'Correct' : 'Review', isDone(r) ? (hasMismatch(r) ? 'No' : 'Yes') : '', r.binMismatchNote || '', r.createdBy || ''
      ])
    );
  };

  const StatusBadge = ({ status }) => <span className={`badge ${statusBadgeClass(status)}`}>{ts(status)}</span>;

  // ── PROFILE VIEW ──────────────────────────────────────────────────────────
  if (isProfileView) return <StaffProfilePage />;

  // ── ADD WASTE VIEW (isolated — form + chatbot only) ───────────────────────
  if (isAddWasteView) {
    const expectedBin = CATEGORY_BIN_MAP[category];
    const binMismatch = expectedBin && expectedBin !== assignedBin;
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 style={{ margin: 0 }}>{t('staff.addTitle')}</h1>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('staff.addSubtitle')}</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/staff')}>
            <ArrowLeft size={15} /> {t('common.backToDashboard')}
          </button>
        </div>

        <div className="form-with-aside">
          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Plus size={18} /> {t('staff.newRecord')}
              </h3>
            </div>

            {successMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(46,204,113,0.12)', color: '#27AE60', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div role="alert" style={{ padding: '0.75rem', backgroundColor: 'rgba(231,76,60,0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">{t('common.description')} ({t('common.optional')})</label>
                <input type="text" className="form-control" placeholder={t('staff.descriptionPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} maxLength={300} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('staff.roomLabel')} <span style={{ color: 'red' }}>*</span></label>
                <input type="text" className="form-control" placeholder={t('staff.roomPlaceholder')} value={room} onChange={e => setRoom(e.target.value)} required list="room-suggestions-add" maxLength={80} />
                <datalist id="room-suggestions-add">
                  {roomOptions.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">{t('common.category')} <span style={{ color: 'red' }}>*</span></label>
                <select className="form-control" value={category} onChange={e => handleCategoryChange(e.target.value)} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{tc(c)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('staff.weightKg')} <span style={{ color: 'red' }}>*</span></label>
                <input type="number" className="form-control" placeholder="2.5" step="0.1" min="0.1" max="500" value={weight} onChange={e => setWeight(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">{t('common.assignedBin')} <span style={{ color: 'red' }}>*</span></label>
                <select className="form-control" value={assignedBin} onChange={e => setAssignedBin(e.target.value)} required>
                  {BINS.map(b => <option key={b} value={b}>{tb(b)} {t('bins.bin')} ({t(`binHints.${b}`)})</option>)}
                </select>
                <small style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: '0.78rem', color: binMismatch ? '#B45309' : '#059669' }}>
                  {binMismatch ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                  {binMismatch ? t('staff.binMismatchWarning', { category: tc(category), bin: tb(expectedBin) }) : t('staff.binSuggestion', { category: tc(category), bin: tb(expectedBin) })}
                </small>
              </div>

              {/* Worker Assignment Selector */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={15} color="#2563EB" /> {t('staff.assignWorker')} <span style={{ color: 'red' }}>*</span>
                </label>
                <select className="form-control" value={selectedWorkerId} onChange={e => setSelectedWorkerId(e.target.value)} required style={{ fontWeight: 500 }}>
                  <option value="">{t('staff.chooseWorker')}</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>{w.name} — {w.department || 'Logistics'} ({w.username || w.email})</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>{t('staff.assignHint')}</small>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }} disabled={submitting}>
                  {submitting ? t('staff.submitting') : t('staff.submit')}
                </button>
              </div>
            </form>
          </div>

          {/* Chatbot */}
          <WasteChatbot role="staff" lang={lang} onSuggest={handleAISuggestion} />
        </div>
      </div>
    );
  }

  // ── HISTORY VIEW ─────────────────────────────────────────────────────────
  if (isHistoryView) {
    const pageRecords = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 style={{ margin: 0 }}>{t('staff.historyTitle')}</h1>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('staff.historySubtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={exportHistory}><Download size={15} /> {t('common.exportCsv')}</button>
            <button className="btn btn-outline" onClick={() => navigate('/staff')}><ArrowLeft size={15} /> {t('common.backToDashboard')}</button>
          </div>
        </div>

        <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input type="text" placeholder={t('staff.historySearch')} className="form-control" style={{ padding: '0.4rem 0.75rem' }} value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select className="form-control" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }} value={historyCategoryFilter} onChange={e => setHistoryCategoryFilter(e.target.value)}>
                <option value="all">{t('common.allCategories')}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{tc(c)}</option>)}
              </select>
            </div>
            <select className="form-control" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }} value={historyStatusFilter} onChange={e => setHistoryStatusFilter(e.target.value)}>
              <option value="all">{t('common.allStatus')}</option>
              <option value="active">{ts('Pending')} / {ts('Assigned')}</option>
              <option value="collected">{ts('Collected')}</option>
              <option value="done">{ts('Completed')}</option>
              <option value="cancelled">{ts('Cancelled')}</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={fetchRecords}><RefreshCw size={13} className={loading ? 'spin' : ''} /> {t('common.refresh')}</button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('common.recordId')}</th>
                  <th>{t('staff.createdIst')}</th>
                  <th>{t('common.room')}</th>
                  <th>{t('common.category')}</th>
                  <th>{t('common.weight')}</th>
                  <th>{t('common.bin')}</th>
                  <th>{t('common.assignedWorker')}</th>
                  <th>{t('staff.compliance')}</th>
                  <th>{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>{t('staff.loadingHistory')}</td></tr>
                ) : pageRecords.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>{t('common.noRecords')}</td></tr>
                ) : (
                  pageRecords.map(record => {
                    const compliant = isCompliant(record.category, record.assignedBin);
                    return (
                      <tr key={record._id || record.recordId}>
                        <td><strong>{record.recordId}</strong></td>
                        <td>{formatISTDate(record.createdAt)} <small style={{ color: 'var(--text-muted)' }}>{formatISTTime(record.createdAt)}</small></td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                        <td>{tc(record.category)}</td>
                        <td>{record.weight} {t('common.kg')}</td>
                        <td><span className={binClass(record.assignedBin)}>{tb(record.assignedBin)}</span></td>
                        <td><span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{record.assignedTo || t('common.unassigned')}</span></td>
                        <td>
                          <span className="badge" style={{ backgroundColor: compliant ? 'rgba(39,174,96,0.1)' : 'rgba(230,126,34,0.1)', color: compliant ? '#27AE60' : '#E67E22' }}>
                            {compliant ? t('staff.correctSegregation') : t('staff.reviewRequired')}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={record.status} />
                          {record.status === 'Cancelled' && record.cancelReason && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2, fontStyle: 'italic' }}>"{record.cancelReason}"</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={historyPage} pageSize={PAGE_SIZE} total={filteredHistory.length} onChange={setHistoryPage} />
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD VIEW (/staff) ─────────────────────────────────────────
  const displayRecords = dashboardTab === 'today' ? recordsCreatedToday : dashboardTab === 'overdue' ? overdueRecords : allRecords;
  const pageRecords = displayRecords.slice((dashboardPage - 1) * PAGE_SIZE, dashboardPage * PAGE_SIZE);
  const tabStyle = (key, activeColor = '#0F172A') => ({
    padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer',
    backgroundColor: dashboardTab === key ? '#FFFFFF' : 'transparent',
    color: dashboardTab === key ? activeColor : '#64748B',
    boxShadow: dashboardTab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
  });

  return (
    <div className="fade-in">
      {/* Top Header with Notification Bell */}
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('common.hospital')} — {t('staff.title')}</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('common.hospitalFull')} — {t('staff.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NotificationBell />
          <div className="badge badge-info" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {t('common.today')}: {formatISTDate(new Date())}
          </div>
        </div>
      </div>

      {/* 5 KPI Summary Cards strictly computed from DB */}
      <div className="kpi-grid" style={{ gap: '1rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid #3498DB' }}>
          <div className="stat-icon stat-blue"><Calendar size={24} /></div>
          <div className="stat-details">
            <h4>{t('staff.recordsCreatedToday')}</h4>
            <div className="value">{loading ? '...' : recordsCreatedToday.length}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #9B59B6' }}>
          <div className="stat-icon stat-purple"><Scale size={24} /></div>
          <div className="stat-details">
            <h4>{t('staff.totalWeightToday')}</h4>
            <div className="value">{loading ? '...' : `${totalTodayWeight.toFixed(1)} ${t('common.kg')}`}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #F39C12' }}>
          <div className="stat-icon stat-yellow"><Clock size={24} /></div>
          <div className="stat-details">
            <h4>{t('staff.pendingCollections')}</h4>
            <div className="value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span>{loading ? '...' : pendingCount}</span>
              {overdueRecords.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 700 }}>({overdueRecords.length} {t('common.overdue').toLowerCase()})</span>
              )}
            </div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="stat-icon stat-blue"><Truck size={24} /></div>
          <div className="stat-details">
            <h4>{t('staff.collectedReady')}</h4>
            <div className="value">{loading ? '...' : collectedCount}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #2ECC71' }}>
          <div className="stat-icon stat-green"><ShieldCheck size={24} /></div>
          <div className="stat-details">
            <h4>{t('staff.disposedToday')}</h4>
            <div className="value" style={{ fontSize: '1.25rem' }}>
              {loading ? '...' : `${disposedTodayCount} ${t('staff.done')}`} <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>({todayComplianceRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card with Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.25rem 0', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calendar size={18} color="#3498DB" /> {t('staff.hospitalCollections')}
            </h3>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
              <button style={tabStyle('today')} onClick={() => setDashboardTab('today')}>{t('staff.tabToday')} ({recordsCreatedToday.length})</button>
              <button style={tabStyle('overdue', '#DC2626')} onClick={() => setDashboardTab('overdue')}>{t('staff.tabOverdue')} ({overdueRecords.length})</button>
              <button style={tabStyle('all')} onClick={() => setDashboardTab('all')}>{t('staff.tabAll')} ({allRecords.length})</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-outline btn-sm" onClick={fetchRecords}><RefreshCw size={13} className={loading ? 'spin' : ''} /> {t('common.refresh')}</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/staff/add-waste')}><Plus size={14} /> {t('staff.addAssignWaste')}</button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('common.recordId')}</th>
                <th>{t('staff.timeIst')}</th>
                <th>{t('common.room')}</th>
                <th>{t('common.category')}</th>
                <th>{t('common.weight')}</th>
                <th>{t('common.assignedBin')}</th>
                <th>{t('staff.workerAssigned')}</th>
                <th>{t('common.status')}</th>
                <th>{t('staff.actionsReminder')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem' }}>{t('staff.loadingRecords')}</td></tr>
              ) : pageRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    {dashboardTab === 'today' ? t('staff.noRecordsToday') : dashboardTab === 'overdue' ? t('staff.noOverdue') : t('staff.noRecordsFound')}
                  </td>
                </tr>
              ) : pageRecords.map(record => {
                const pending = isActive(record);
                const overdueInfo = calculateOverdueInfo(record.assignedTime || record.createdAt, 120);
                const isOverdue = pending && (!isTodayInIST(record.createdAt) || overdueInfo.isOverdue);
                const remStatus = reminderState[record.recordId];

                return (
                  <tr key={record._id || record.recordId}>
                    <td>
                      <strong>{record.recordId}</strong>
                      {isOverdue && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>⚠ {overdueInfo.durationStr || t('common.overdue')}</span>
                      )}
                    </td>
                    <td>
                      <div>{formatISTTime(record.createdAt)}</div>
                      <small style={{ color: 'var(--text-muted)' }}>{formatISTDate(record.createdAt)}</small>
                    </td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                    <td>{tc(record.category)}</td>
                    <td>{record.weight} {t('common.kg')}</td>
                    <td><span className={binClass(record.assignedBin)}>{tb(record.assignedBin)}</span></td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                        {record.assignedTo || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>{t('common.unassigned')}</span>}
                      </span>
                    </td>
                    <td><StatusBadge status={record.status} /></td>
                    <td>
                      {pending ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: isOverdue ? '#DC2626' : '#2563EB', color: isOverdue ? '#DC2626' : '#2563EB' }}
                              disabled={Boolean(remStatus && remStatus.status === 'sending')}
                              onClick={() => handleSendReminder(record)}
                            >
                              <Send size={11} /> {remStatus ? remStatus.msg : t('staff.sendReminder')}
                            </button>
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} title={t('staff.cancelTitle', { id: record.recordId })} onClick={() => { setCancelTarget(record); setCancelReason(''); }}>
                              <XCircle size={11} /> {t('staff.cancelRecord')}
                            </button>
                          </div>
                          {record.lastReminderSentAt && !remStatus && (
                            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{t('staff.sent')}: {formatISTTime(record.lastReminderSentAt)}</span>
                          )}
                        </div>
                      ) : record.status === 'Cancelled' ? (
                        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{t('staff.cancelledBy', { name: record.cancelledBy || t('roles.medicalStaff') })}</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>✓ {t('staff.collectedByWorker', { name: record.collectedBy || t('common.worker') })}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={dashboardPage} pageSize={PAGE_SIZE} total={displayRecords.length} onChange={setDashboardPage} />
      </div>

      {/* ── Worker Verification & Bin Audit Section ─────────── */}
      <div id="worker-verification-staff-section" className="card" style={{ marginTop: '1.5rem', padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.25rem 1.25rem 0', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} color="#7C3AED" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {t('staff.verificationTitle')}
                <span className="badge" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '0.75rem', fontWeight: 700 }}>{t('staff.liveAudit')}</span>
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('staff.verificationSub')}</p>
            </div>
          </div>
        </div>

        {/* 3 Verification Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          {[
            { label: t('staff.awaitingVerification'), sub: t('staff.awaitingVerificationSub'), value: liveRecords.filter(r => r.status === 'Collected').length, Icon: Truck, color: '#2563EB', border: '#DBEAFE', text: '#1E40AF', dark: '#1E3A8A' },
            { label: t('staff.verifiedCompleted'), sub: t('staff.verifiedCompletedSub'), value: liveRecords.filter(r => isDone(r) && !hasMismatch(r)).length, Icon: CheckCircle, color: '#059669', border: '#A7F3D0', text: '#065F46', dark: '#064E3B' },
            { label: t('staff.mismatchesReported'), sub: t('staff.mismatchesReportedSub'), value: liveRecords.filter(hasMismatch).length, Icon: AlertTriangle, color: '#DC2626', border: '#FECACA', text: '#991B1B', dark: '#7F1D1D' },
          ].map(c => (
            <div key={c.label} style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: `1px solid ${c.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.text, textTransform: 'uppercase' }}>{c.label}</span>
                <c.Icon size={17} color={c.color} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.dark, marginTop: '0.2rem' }}>{c.value}</div>
              <div style={{ fontSize: '0.75rem', color: c.color }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Verification Records Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('common.recordId')}</th>
                <th>{t('common.room')}</th>
                <th>{t('common.category')}</th>
                <th>{t('common.assignedBin')}</th>
                <th>{t('common.collectedBy')}</th>
                <th>{t('staff.collectionStatus')}</th>
                <th>{t('staff.verificationResult')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>{t('staff.loadingVerifications')}</td></tr>
              ) : liveRecords.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>{t('staff.noVerification')}</td></tr>
              ) : (
                liveRecords.slice(0, 10).map(record => (
                  <tr key={record._id || record.recordId}>
                    <td><strong>{record.recordId}</strong></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                    <td>{tc(record.category)} ({record.weight} {t('common.kg')})</td>
                    <td><span className={binClass(record.assignedBin)}>{tb(record.assignedBin)}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <strong>{record.collectedBy || (record.assignedTo ? `${record.assignedTo} (${t('staff.assigned')})` : t('common.unassigned'))}</strong>
                      {record.collectedAt && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatISTDateTime(record.collectedAt)}</div>}
                    </td>
                    <td><StatusBadge status={record.status} /></td>
                    <td>
                      {hasMismatch(record) ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }}><AlertTriangle size={12} /> {t('staff.mismatchReported')}</span>
                          {record.binMismatchNote && <span style={{ fontSize: '0.75rem', color: '#B91C1C', fontStyle: 'italic' }}>"{record.binMismatchNote}"</span>}
                        </div>
                      ) : record.binVerified ? (
                        <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 700 }}><CheckCircle size={12} /> {t('staff.bagMatchedBin')}</span>
                      ) : record.status === 'Collected' ? (
                        <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}><Clock size={12} /> {t('staff.awaitingBadge')}</span>
                      ) : isDone(record) ? (
                        <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 600 }}>✓ {t('staff.completedDisposed')}</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{t('staff.pendingPickup')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Record Modal */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="card modal-card fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setCancelTarget(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
            <h3 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={20} color="#DC2626" /> {t('staff.cancelTitle', { id: cancelTarget.recordId })}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('staff.cancelPrompt')}</p>
            <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Info size={15} color="#64748B" /> {cancelTarget.room} • {tc(cancelTarget.category)} • {cancelTarget.weight} {t('common.kg')} • {cancelTarget.assignedTo || t('common.unassigned')}
            </div>
            <div className="form-group">
              <label className="form-label">{t('common.reason')} ({t('common.optional')})</label>
              <textarea className="form-control" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t('staff.cancelReasonPlaceholder')} maxLength={200} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCancelTarget(null)} disabled={cancelling}>{t('common.close')}</button>
              <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#DC2626', borderColor: '#DC2626' }} onClick={confirmCancel} disabled={cancelling}>
                {cancelling ? t('common.saving') : t('staff.confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
