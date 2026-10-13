import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, CheckCircle, RefreshCw, Calendar, 
  Clock, Scale, ShieldCheck, Search, Filter, ArrowLeft,
  Shield, AlertTriangle, Truck, Bell, Send, UserCheck, AlertCircle
} from 'lucide-react';
import WasteChatbot from '../components/WasteChatbot';
import NotificationBell from '../components/NotificationBell';
import { api } from '../services/api';
import StaffProfilePage from './StaffProfilePage';
import { 
  isTodayInIST, 
  formatISTDate, 
  formatISTTime, 
  formatISTDateTime, 
  calculateOverdueInfo 
} from '../utils/dateUtils';

// Helper function to evaluate segregation compliance status
export const getComplianceStatus = (category, assignedBin) => {
  if (!category || !assignedBin) {
    return { text: 'Correct Segregation', isCompliant: true, color: '#27AE60', bg: 'rgba(39, 174, 96, 0.1)' };
  }
  const cat = category.toLowerCase();
  const bin = assignedBin.toLowerCase();
  let isMatch = false;
  if (cat.includes('infectious') || cat.includes('soiled') || cat.includes('chemical')) {
    isMatch = bin.includes('yellow');
  } else if (cat.includes('sharp')) {
    isMatch = bin.includes('white') || bin.includes('blue');
  } else if (cat.includes('recyclable') || cat.includes('plastic')) {
    isMatch = bin.includes('red') || bin.includes('blue');
  } else if (cat.includes('general')) {
    isMatch = bin.includes('green');
  } else {
    isMatch = true;
  }
  return isMatch
    ? { text: 'Correct Segregation', isCompliant: true, color: '#27AE60', bg: 'rgba(39, 174, 96, 0.1)' }
    : { text: 'Review Required', isCompliant: false, color: '#E67E22', bg: 'rgba(230, 126, 34, 0.1)' };
};

const StaffDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isHistoryView = location.pathname.includes('/history');
  const isAddWasteView = location.pathname.includes('/add-waste');
  const isProfileView = location.pathname.includes('/profile');

  const [wasteRecords, setWasteRecords] = useState([]);
  const [allHistoryRecords, setAllHistoryRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active view tab in main dashboard: 'today' | 'overdue' | 'all'
  const [dashboardTab, setDashboardTab] = useState('today');

  // Form Fields
  const [description, setDescription] = useState('');
  const [room, setRoom] = useState('Room 203');
  const [category, setCategory] = useState('Infectious Waste');
  const [weight, setWeight] = useState('');
  const [assignedBin, setAssignedBin] = useState('Yellow');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // Reminder feedback state: { [recordId]: { status: 'sending'|'sent'|'error', msg: string } }
  const [reminderState, setReminderState] = useState({});

  // History View Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');

  const roomOptions = [
    'Room 203', 'Room 101', 'Room 105', 'ICU',
    'Emergency', 'Laboratory', 'Operation Theatre'
  ];

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    fetchRecords();
    fetchWorkers();
  }, [location.pathname]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [todayData, allData] = await Promise.all([
        api.getTodayRecords(),
        api.getWasteRecords()
      ]);
      setWasteRecords(todayData);
      setAllHistoryRecords(allData);
    } catch (err) {
      console.error('Error fetching staff waste records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const workerList = await api.getActiveWorkers();
      setWorkers(workerList || []);
      if (workerList && workerList.length > 0 && !selectedWorkerId) {
        setSelectedWorkerId(workerList[0]._id);
      }
    } catch (err) {
      console.warn('Failed to load workers:', err);
    }
  };

  // Called by chatbot when it identifies waste — auto-fills the form
  const handleAISuggestion = (suggestion) => {
    if (!suggestion) return;
    if (suggestion.type) {
      const typeMap = {
        'Sharps': 'Sharps',
        'Sharps & Cutters': 'Sharps',
        'Infectious / Soiled Waste': 'Infectious Waste',
        'Contaminated Recyclable Plastics': 'Contaminated Recyclable',
        'Glassware & Metallic Implants': 'General Waste',
        'General Non-Hazardous Waste': 'General Waste',
        'Chemical & Pharmaceutical Waste': 'Chemical Waste',
      };
      setCategory(typeMap[suggestion.type] || suggestion.type);
    }
    if (suggestion.bin) {
      setAssignedBin(suggestion.bin.split(' ')[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!room || !category || !weight || !assignedBin) {
      setErrorMsg('Room, Category, Weight, and Assigned Bin are required.');
      return;
    }
    try {
      setSubmitting(true);
      const assignedWorker = workers.find(w => w._id === selectedWorkerId);
      const newRecord = await api.createWasteRecord({
        description, 
        room, 
        category,
        weight: Number(weight),
        assignedBin,
        createdBy: currentUser.name || 'Medical Staff',
        assignedTo: assignedWorker ? assignedWorker.name : '',
        assignedToUserId: assignedWorker ? assignedWorker._id : ''
      });
      setSuccessMsg(`✓ Waste Record ${newRecord.record.recordId} logged and assigned to ${assignedWorker ? assignedWorker.name : 'Unassigned'}!`);
      setDescription('');
      setWeight('');
      await fetchRecords();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log waste record');
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Sends Overdue Reminder to Worker
  const handleSendReminder = async (record) => {
    try {
      setReminderState(prev => ({ ...prev, [record.recordId]: { status: 'sending', msg: 'Sending...' } }));
      const res = await api.sendWasteReminder({
        wasteRecordId: record._id,
        recordId: record.recordId,
        staffName: currentUser.name || 'Medical Staff',
        staffId: currentUser.id || '',
        cooldownSeconds: 60
      });
      setReminderState(prev => ({
        ...prev,
        [record.recordId]: { status: 'sent', msg: `Reminder sent to ${record.assignedTo || 'worker'} ✓` }
      }));
      await fetchRecords();
      setTimeout(() => {
        setReminderState(prev => {
          const next = { ...prev };
          delete next[record.recordId];
          return next;
        });
      }, 6000);
    } catch (err) {
      alert(err.message || 'Failed to send reminder');
      setReminderState(prev => ({
        ...prev,
        [record.recordId]: { status: 'error', msg: err.message || 'Failed' }
      }));
      setTimeout(() => {
        setReminderState(prev => {
          const next = { ...prev };
          delete next[record.recordId];
          return next;
        });
      }, 4000);
    }
  };

  // ── Metrics Calculation (Single Source of Truth) ──────────────────────────
  // Today's records strictly in Asia/Kolkata
  const recordsCreatedToday = allHistoryRecords.filter(r => isTodayInIST(r.createdAt));
  const totalTodayWeight = recordsCreatedToday.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  
  // Outstanding pending across all days (including overdue previous-day records)
  const pendingCount = allHistoryRecords.filter(r => r.status === 'Pending' || r.status === 'Assigned').length;
  
  // Collected records awaiting disposal
  const collectedCount = allHistoryRecords.filter(r => r.status === 'Collected').length;
  
  // Disposed records today
  const disposedTodayCount = allHistoryRecords.filter(r => 
    (r.status === 'Completed' || r.status === 'Disposed') && 
    isTodayInIST(r.completedAt || r.disposedAt || r.updatedAt)
  ).length;

  // Compliance Rate of today's logged records
  const compliantCount = recordsCreatedToday.filter(r => getComplianceStatus(r.category, r.assignedBin).isCompliant).length;
  const todayComplianceRate = recordsCreatedToday.length > 0 ? Math.round((compliantCount / recordsCreatedToday.length) * 100) : 100;

  // Overdue / Previous-day pending records
  const overdueRecords = allHistoryRecords.filter(r => {
    if (r.status !== 'Pending' && r.status !== 'Assigned') return false;
    const isPastDay = !isTodayInIST(r.createdAt);
    const { isOverdue } = calculateOverdueInfo(r.assignedTime || r.createdAt, 120);
    return isPastDay || isOverdue;
  });

  const filteredHistory = allHistoryRecords.filter(record => {
    const matchesSearch = !historySearch ||
      record.recordId?.toLowerCase().includes(historySearch.toLowerCase()) ||
      record.room?.toLowerCase().includes(historySearch.toLowerCase()) ||
      record.description?.toLowerCase().includes(historySearch.toLowerCase()) ||
      record.assignedTo?.toLowerCase().includes(historySearch.toLowerCase());
    const matchesCategory = historyCategoryFilter === 'all' || record.category === historyCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ── PROFILE VIEW ──────────────────────────────────────────────────────────
  if (isProfileView) return <StaffProfilePage />;

  // ── ADD WASTE VIEW (isolated — form + chatbot only) ───────────────────────
  if (isAddWasteView) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Add Waste Record</h1>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Log a new biomedical waste entry and assign it immediately to a collection worker
            </p>
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => navigate('/staff')}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Plus size={18} /> New Waste Record &amp; Worker Assignment
              </h3>
            </div>

            {successMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(46,204,113,0.12)', color: '#27AE60', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(231,76,60,0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Waste Description (Optional)</label>
                <input
                  type="text" className="form-control"
                  placeholder="e.g. Blood-soaked cotton swabs, used gloves..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Number / Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text" className="form-control"
                  placeholder="e.g. Room 203, ICU, Lab..."
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  required
                  list="room-suggestions-add"
                />
                <datalist id="room-suggestions-add">
                  {roomOptions.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Category <span style={{ color: 'red' }}>*</span></label>
                <select className="form-control" value={category} onChange={e => setCategory(e.target.value)} required>
                  <option value="Infectious Waste">Infectious Waste</option>
                  <option value="Sharps">Sharps</option>
                  <option value="Chemical Waste">Chemical Waste</option>
                  <option value="General Waste">General Waste</option>
                  <option value="Contaminated Recyclable">Contaminated Recyclable</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Weight (kg) <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="number" className="form-control"
                  placeholder="2.5" step="0.1" min="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Bin <span style={{ color: 'red' }}>*</span></label>
                <select className="form-control" value={assignedBin} onChange={e => setAssignedBin(e.target.value)} required>
                  <option value="Yellow">Yellow Bin (Infectious)</option>
                  <option value="Red">Red Bin (Recyclable Plastic)</option>
                  <option value="White">White Bin (Sharps)</option>
                  <option value="Blue">Blue Bin (Glassware)</option>
                  <option value="Green">Green Bin (General)</option>
                </select>
              </div>

              {/* Worker Assignment Selector */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={15} color="#2563EB" /> Assign Collection Worker <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={selectedWorkerId}
                  onChange={e => setSelectedWorkerId(e.target.value)}
                  required
                  style={{ fontWeight: 500 }}
                >
                  <option value="">-- Choose sanitation / collection worker --</option>
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>
                      {w.name} — {w.department || 'Logistics'} ({w.username || w.email})
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                  Assigning a worker notifies them instantly and places this task directly in their Assigned Collections table.
                </small>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }} disabled={submitting}>
                  {submitting ? 'Logging & Assigning Task...' : 'Log & Assign Waste Record'}
                </button>
              </div>
            </form>
          </div>

          {/* Chatbot */}
          <WasteChatbot role="staff" onSuggest={handleAISuggestion} />
        </div>
      </div>
    );
  }

  // ── HISTORY VIEW ─────────────────────────────────────────────────────────
  if (isHistoryView) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Waste Log History</h1>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Complete historical repository of logged hospital biomedical waste records
            </p>
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => navigate('/staff')}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>

        <div className="card fade-in">
          <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text" placeholder="Search by Record ID, Room, Worker, Description..."
                className="form-control" style={{ padding: '0.4rem 0.75rem' }}
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select className="form-control" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                value={historyCategoryFilter} onChange={e => setHistoryCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="Infectious Waste">Infectious Waste</option>
                <option value="Sharps">Sharps</option>
                <option value="Chemical Waste">Chemical Waste</option>
                <option value="General Waste">General Waste</option>
                <option value="Contaminated Recyclable">Contaminated Recyclable</option>
              </select>
            </div>
            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={fetchRecords}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Created (IST)</th>
                  <th>Room</th>
                  <th>Category</th>
                  <th>Weight</th>
                  <th>Bin</th>
                  <th>Assigned Worker</th>
                  <th>Compliance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td></tr>
                ) : (
                  filteredHistory.map(record => {
                    const compliance = getComplianceStatus(record.category, record.assignedBin);
                    return (
                      <tr key={record._id || record.recordId}>
                        <td><strong>{record.recordId}</strong></td>
                        <td>{formatISTDate(record.createdAt)} <small style={{ color: 'var(--text-muted)' }}>{formatISTTime(record.createdAt)}</small></td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                        <td>{record.category}</td>
                        <td>{record.weight} kg</td>
                        <td><span className={`bin-tag bin-${record.assignedBin.toLowerCase()}`}>{record.assignedBin}</span></td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            {record.assignedTo || 'Unassigned'}
                          </span>
                        </td>
                        <td><span className="badge" style={{ backgroundColor: compliance.bg, color: compliance.color }}>{compliance.text}</span></td>
                        <td>
                          <span className={`badge ${
                            record.status === 'Completed' || record.status === 'Disposed' ? 'badge-success' :
                            record.status === 'Collected' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD VIEW (/staff) ─────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* Top Header with Notification Bell */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>KMCH HOSPITAL — Medical Staff Dashboard</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            KMCH Kovai Medical Center & Hospital — Waste Segregation, Logging & Compliance
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NotificationBell role="staff" userId={currentUser.id} />
          <div className="badge badge-info" style={{ padding: '0.55rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Today: {formatISTDate(new Date())}
          </div>
        </div>
      </div>

      {/* 5 KPI Summary Cards strictly computed from DB */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid #3498DB' }}>
          <div className="stat-icon stat-blue"><Calendar size={24} /></div>
          <div className="stat-details">
            <h4>Records Created Today</h4>
            <div className="value">{loading ? '...' : recordsCreatedToday.length}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #9B59B6' }}>
          <div className="stat-icon stat-blue"><Scale size={24} /></div>
          <div className="stat-details">
            <h4>Total Weight Today</h4>
            <div className="value">{loading ? '...' : `${totalTodayWeight.toFixed(1)} kg`}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #F39C12' }}>
          <div className="stat-icon stat-yellow"><Clock size={24} /></div>
          <div className="stat-details">
            <h4>Pending Collections</h4>
            <div className="value" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span>{loading ? '...' : pendingCount}</span>
              {overdueRecords.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 700 }}>
                  ({overdueRecords.length} overdue)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="stat-icon stat-blue"><Truck size={24} /></div>
          <div className="stat-details">
            <h4>Collected / Ready to Dispose</h4>
            <div className="value">{loading ? '...' : collectedCount}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #2ECC71' }}>
          <div className="stat-icon stat-green"><ShieldCheck size={24} /></div>
          <div className="stat-details">
            <h4>Disposed Today / Compliance</h4>
            <div className="value" style={{ fontSize: '1.25rem' }}>
              {loading ? '...' : `${disposedTodayCount} done`} <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>({todayComplianceRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card with Tabs */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calendar size={18} color="#3498DB" /> Hospital Waste Collections
            </h3>
            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
              <button
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  backgroundColor: dashboardTab === 'today' ? '#FFFFFF' : 'transparent',
                  color: dashboardTab === 'today' ? '#0F172A' : '#64748B',
                  boxShadow: dashboardTab === 'today' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setDashboardTab('today')}
              >
                Today's Records ({recordsCreatedToday.length})
              </button>
              <button
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  backgroundColor: dashboardTab === 'overdue' ? '#FFFFFF' : 'transparent',
                  color: dashboardTab === 'overdue' ? '#DC2626' : '#64748B',
                  boxShadow: dashboardTab === 'overdue' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setDashboardTab('overdue')}
              >
                Overdue / Outstanding ({overdueRecords.length})
              </button>
              <button
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  backgroundColor: dashboardTab === 'all' ? '#FFFFFF' : 'transparent',
                  color: dashboardTab === 'all' ? '#0F172A' : '#64748B',
                  boxShadow: dashboardTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setDashboardTab('all')}
              >
                All Records ({allHistoryRecords.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={fetchRecords}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }} onClick={() => navigate('/staff/add-waste')}>
              <Plus size={14} style={{ marginRight: '4px' }} /> Add &amp; Assign Waste
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Time (IST)</th>
                <th>Room</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Assigned Bin</th>
                <th>Worker Assigned</th>
                <th>Status</th>
                <th>Actions / Reminder</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading waste records...</td></tr>
              ) : (
                (() => {
                  const displayRecords = dashboardTab === 'today' ? recordsCreatedToday :
                    dashboardTab === 'overdue' ? overdueRecords : allHistoryRecords;
                  
                  if (displayRecords.length === 0) {
                    return (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                          {dashboardTab === 'today' ? "No waste records created today yet. Click 'Add & Assign Waste' above." :
                           dashboardTab === 'overdue' ? "No overdue collections! All tasks are on schedule." :
                           "No hospital waste records found."}
                        </td>
                      </tr>
                    );
                  }

                  return displayRecords.map(record => {
                    const isPending = record.status === 'Pending' || record.status === 'Assigned';
                    const overdueInfo = calculateOverdueInfo(record.assignedTime || record.createdAt, 120);
                    const isOverdue = isPending && (!isTodayInIST(record.createdAt) || overdueInfo.isOverdue);
                    const remStatus = reminderState[record.recordId];

                    return (
                      <tr key={record._id || record.recordId}>
                        <td>
                          <strong>{record.recordId}</strong>
                          {isOverdue && (
                            <span style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#DC2626',
                              fontWeight: 700,
                              marginTop: '2px'
                            }}>
                              ⚠ {overdueInfo.durationStr || 'Overdue'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>{formatISTTime(record.createdAt)}</div>
                          <small style={{ color: 'var(--text-muted)' }}>{formatISTDate(record.createdAt)}</small>
                        </td>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                        <td>{record.category}</td>
                        <td>{record.weight} kg</td>
                        <td><span className={`bin-tag bin-${record.assignedBin.toLowerCase()}`}>{record.assignedBin}</span></td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                            {record.assignedTo || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            record.status === 'Completed' || record.status === 'Disposed' ? 'badge-success' : 
                            record.status === 'Collected' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          {isPending ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  borderColor: isOverdue ? '#DC2626' : '#2563EB',
                                  color: isOverdue ? '#DC2626' : '#2563EB',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                disabled={Boolean(remStatus && remStatus.status === 'sending')}
                                onClick={() => handleSendReminder(record)}
                              >
                                <Send size={11} /> {remStatus ? remStatus.msg : 'Send Reminder'}
                              </button>
                              {record.lastReminderSentAt && !remStatus && (
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                  Sent: {formatISTTime(record.lastReminderSentAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                              ✓ Collected by {record.collectedBy || 'Worker'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Worker Verification & Bin Audit Section (Staff Dashboard) ─────────── */}
      <div id="worker-verification-staff-section" className="card" style={{ marginTop: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={22} color="#7C3AED" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Worker Verification &amp; Bin Audit
                <span className="badge" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED', fontSize: '0.75rem', fontWeight: 700 }}>
                  Live Audit
                </span>
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Track worker collection status, bag-to-bin color verification, and reported mismatches recalculated from actual DB records
              </p>
            </div>
          </div>
          <button
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={fetchRecords}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* 3 Verification Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>Awaiting Verification</span>
              <Truck size={17} color="#2563EB" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E3A8A', marginTop: '0.2rem' }}>
              {allHistoryRecords.filter(r => r.status === 'Collected').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Physically collected waste awaiting worker bin-verification</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Verified &amp; Completed</span>
              <CheckCircle size={17} color="#059669" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064E3B', marginTop: '0.2rem' }}>
              {allHistoryRecords.filter(r => (r.status === 'Completed' || r.status === 'Disposed') && r.binVerified !== false).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10B981' }}>Waste bags verified matching assigned bin colour and disposed</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Mismatches Reported</span>
              <AlertTriangle size={17} color="#DC2626" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7F1D1D', marginTop: '0.2rem' }}>
              {allHistoryRecords.filter(r => Boolean(r.binMismatchNote) || r.binVerified === false).length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>Discrepancies reported by collection workers</div>
          </div>
        </div>

        {/* Verification Records Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Room</th>
                <th>Category</th>
                <th>Assigned Bin</th>
                <th>Collected By</th>
                <th>Collection Status</th>
                <th>Worker Verification Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>Loading worker verifications...</td></tr>
              ) : allHistoryRecords.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>No verification records found.</td></tr>
              ) : (
                allHistoryRecords.slice(0, 10).map(record => (
                  <tr key={record._id || record.recordId}>
                    <td><strong>{record.recordId}</strong></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{record.room}</span></td>
                    <td>{record.category} ({record.weight} kg)</td>
                    <td><span className={`bin-tag bin-${(record.assignedBin || '').toLowerCase()}`}>{record.assignedBin}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <strong>{record.collectedBy || (record.assignedTo ? `${record.assignedTo} (Assigned)` : 'Unassigned')}</strong>
                      {record.collectedAt && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatISTDateTime(record.collectedAt)}</div>}
                    </td>
                    <td>
                      <span className={`badge ${record.status === 'Completed' || record.status === 'Disposed' ? 'badge-success' : record.status === 'Collected' ? 'badge-info' : 'badge-warning'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      {record.binMismatchNote ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={12} /> Mismatch Reported
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#B91C1C', fontStyle: 'italic' }}>
                            "{record.binMismatchNote}"
                          </span>
                        </div>
                      ) : record.binVerified ? (
                        <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Bag Matched Bin
                        </span>
                      ) : record.status === 'Collected' ? (
                        <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Collected (Awaiting Verification)
                        </span>
                      ) : record.status === 'Completed' || record.status === 'Disposed' ? (
                        <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 600 }}>
                          ✓ Completed &amp; Disposed
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Pending Pickup</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
