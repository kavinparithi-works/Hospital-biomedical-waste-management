import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Package, Clock, CheckCircle, ShieldCheck, 
  AlertTriangle, RefreshCw, Search, Filter, Calendar, 
  Eye, X, MapPin, Check, Shield
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  formatISTDateTime, 
  calculateOverdueInfo, 
  isTodayInIST 
} from '../../utils/dateUtils';

const binClass = (bin) => `bin-tag bin-${(bin || '').toLowerCase()}`;

const WorkerAssignedPage = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    todayAssignedPickups: 0,
    pendingCollections: 0,
    inTransitCollections: 0,
    completedDisposals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'collected'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  // Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [binVerifyRecord, setBinVerifyRecord] = useState(null);
  const [binMatch, setBinMatch] = useState(true);
  const [binMismatchNote, setBinMismatchNote] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recordsData, statsData] = await Promise.all([
        api.getWasteRecords({ workerName: currentUser.name, workerId: currentUser.id }),
        api.getWorkerStats(currentUser.name, currentUser.id)
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading assigned collections:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.name, currentUser.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Collect: Pending -> Collected
  const handleCollect = async (record) => {
    if (record.status === 'Collected' || record.status === 'Completed') return;
    try {
      setActionLoading(true);
      await api.collectWasteRecord(record._id, currentUser.name || 'Worker User', currentUser.id);
      setSelectedTask(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to collect waste record');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dispose: Collected -> Disposed
  const handleStartDispose = (record) => {
    if (record.status !== 'Collected') {
      alert('Waste must be collected before it can be disposed of.');
      return;
    }
    setBinVerifyRecord(record);
    setBinMatch(true);
    setBinMismatchNote('');
  };

  const confirmDisposal = async () => {
    if (!binVerifyRecord) return;
    try {
      setActionLoading(true);
      await api.completeWasteRecord(
        binVerifyRecord._id,
        currentUser.name || 'Worker User',
        currentUser.id || '',
        binMatch,
        binMatch ? '' : binMismatchNote
      );
      setBinVerifyRecord(null);
      setSelectedTask(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to complete waste disposal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Filter tasks assigned to worker (active tasks: Pending and Collected)
  const activeAssignedRecords = records.filter(r => r.status === 'Pending' || r.status === 'Assigned' || r.status === 'Collected');

  const filteredTasks = activeAssignedRecords.filter(r => {
    if (statusFilter === 'pending' && !(r.status === 'Pending' || r.status === 'Assigned')) return false;
    if (statusFilter === 'collected' && r.status !== 'Collected') return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (roomFilter && r.room !== roomFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchId = (r.recordId || '').toLowerCase().includes(q);
      const matchRoom = (r.room || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchId && !matchRoom && !matchDesc) return false;
    }
    return true;
  });

  const uniqueRooms = [...new Set(records.map(r => r.room).filter(Boolean))].sort();
  const uniqueCategories = [...new Set(records.map(r => r.category).filter(Boolean))].sort();

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={26} color="var(--primary-blue)" />
            Assigned Collections
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pickups assigned to {currentUser.name || 'Worker'} • Pending collection & disposal routing
          </p>
        </div>
        <button 
          id="btn-refresh-assigned"
          className="btn btn-outline" 
          onClick={loadData}
          disabled={loading || actionLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Collections
        </button>
      </div>

      {/* Summary Metrics Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #2563EB' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={22} color="#2563EB" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assigned Pickups Today</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : (stats.todayAssignedPickups ?? records.filter(r => isTodayInIST(r.assignedTime || r.createdAt)).length)}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} color="#F59E0B" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending Pickups</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : (stats.pendingCollections ?? records.filter(r => r.status === 'Pending' || r.status === 'Assigned').length)}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #059669' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Collected (Ready to Dispose)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : records.filter(r => r.status === 'Collected').length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Completed Disposals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
              {loading ? '...' : (stats.completedDisposals ?? records.filter(r => r.status === 'Completed' || r.status === 'Disposed').length)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              id="assigned-search-input"
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              placeholder="Search Record ID (e.g. WR-201) or Room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select 
            id="assigned-status-filter"
            className="form-control"
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Active Statuses</option>
            <option value="pending">Pending Pickups</option>
            <option value="collected">Collected (Ready for Disposal)</option>
          </select>

          {/* Room filter */}
          <select 
            id="assigned-room-filter"
            className="form-control"
            style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem' }}
            value={roomFilter}
            onChange={e => setRoomFilter(e.target.value)}
          >
            <option value="">All Rooms</option>
            {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Category filter */}
          <select 
            id="assigned-category-filter"
            className="form-control"
            style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Waste Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(search || statusFilter !== 'all' || roomFilter || categoryFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setRoomFilter(''); setCategoryFilter(''); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #FECACA', fontSize: '0.8rem', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Assigned Collection Tasks Table */}
      <div className="card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Assigned Collection Tasks</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredTasks.length} active collection task(s)
            </span>
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '850px' }}>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Room</th>
                <th>Waste Category</th>
                <th>Weight</th>
                <th>Assigned Bin</th>
                <th>Assigned Time</th>
                <th>Current Status</th>
                <th style={{ textAlign: 'right' }}>Available Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading assigned collections...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    <CheckCircle size={32} color="#10B981" style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                    <strong style={{ display: 'block', color: '#1E293B', marginBottom: '0.25rem' }}>No Active Assigned Collections</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      All assigned pickups are completed or no tasks match your filters.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task._id || task.recordId}>
                    <td>
                      <strong>{task.recordId}</strong>
                      {(task.status === 'Pending' || task.status === 'Assigned') && (() => {
                        const overdue = calculateOverdueInfo(task.assignedTime || task.createdAt, 120);
                        const isPast = !isTodayInIST(task.createdAt);
                        if (isPast || overdue.isOverdue) {
                          return (
                            <span style={{ display: 'block', color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, marginTop: '2px' }}>
                              ⚠ {overdue.durationStr || 'Overdue'}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedTask(task)}
                        style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {task.room}
                      </button>
                    </td>
                    <td style={{ fontSize: '0.86rem' }}>{task.category}</td>
                    <td style={{ fontWeight: 600 }}>{task.weight} kg</td>
                    <td>
                      <span className={binClass(task.assignedBin)}>
                        {task.assignedBin}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                      {formatISTDateTime(task.assignedTime || task.createdAt)}
                    </td>
                    <td>
                      {(task.status === 'Pending' || task.status === 'Assigned') && (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Pending
                        </span>
                      )}
                      {task.status === 'Collected' && (
                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
                          <Package size={12} /> Collected
                        </span>
                      )}
                      {(task.status === 'Completed' || task.status === 'Disposed') && (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Disposed
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {/* Stage 1: Pending -> Collect button enabled */}
                        {(task.status === 'Pending' || task.status === 'Assigned') && (
                          <button
                            id={`btn-collect-${task.recordId}`}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleCollect(task)}
                            disabled={actionLoading}
                          >
                            <Package size={13} /> Collect
                          </button>
                        )}

                        {/* Stage 2: Collected -> Dispose button enabled (next valid action) */}
                        {task.status === 'Collected' && (
                          <button
                            id={`btn-dispose-${task.recordId}`}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleStartDispose(task)}
                            disabled={actionLoading}
                          >
                            <ShieldCheck size={13} /> Dispose
                          </button>
                        )}

                        {/* Stage 3: Completed -> Retained / view only */}
                        {(task.status === 'Completed' || task.status === 'Disposed') && (
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={13} /> Disposed ✓
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Task Details — {selectedTask.recordId}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Created by {selectedTask.createdBy || 'Medical Staff'}</span>
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Room Location</span>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '0.2rem' }}>{selectedTask.room}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Waste Category</span>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedTask.category}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Weight</span>
                  <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{selectedTask.weight} kg</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Bin</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span className={binClass(selectedTask.assignedBin)}>{selectedTask.assignedBin}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Time</span>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>{formatDateTime(selectedTask.assignedTime || selectedTask.createdAt)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Status</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span className="badge">{selectedTask.status}</span>
                  </div>
                </div>
              </div>

              {selectedTask.description && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Description</span>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{selectedTask.description}</span>
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#F8FAFC' }}>
              <button className="btn btn-outline" onClick={() => setSelectedTask(null)}>Close</button>
              {(selectedTask.status === 'Pending' || selectedTask.status === 'Assigned') && (
                <button className="btn btn-primary" onClick={() => handleCollect(selectedTask)} disabled={actionLoading}>
                  <Package size={14} /> Collect Waste
                </button>
              )}
              {selectedTask.status === 'Collected' && (
                <button className="btn btn-primary" style={{ backgroundColor: '#059669', borderColor: '#059669' }} onClick={() => { setSelectedTask(null); handleStartDispose(selectedTask); }}>
                  <ShieldCheck size={14} /> Proceed to Dispose
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bin Verification & Disposal Modal */}
      {binVerifyRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={24} color="#059669" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#065F46' }}>
                  Waste Disposal &amp; Bin Verification
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#047857' }}>
                  Record ID: {binVerifyRecord.recordId} • Room: {binVerifyRecord.room}
                </span>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Assigned Bin Standard:</span>
                  <span className={binClass(binVerifyRecord.assignedBin)} style={{ fontSize: '0.85rem' }}>
                    {binVerifyRecord.assignedBin} Bin
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Waste Category:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{binVerifyRecord.category}</span>
                </div>
              </div>

              <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0F172A', marginBottom: '0.75rem' }}>
                Does the waste bag color match the assigned bin ({binVerifyRecord.assignedBin})?
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem',
                  borderRadius: '8px', border: binMatch ? '2px solid #059669' : '1px solid var(--border-color)',
                  backgroundColor: binMatch ? '#F0FDF4' : '#FFFFFF', cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="binMatch" 
                    checked={binMatch === true} 
                    onChange={() => setBinMatch(true)} 
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#065F46' }}>Yes — Bag matches assigned bin</strong>
                    <span style={{ fontSize: '0.75rem', color: '#059669' }}>Correct color-coding verified for final disposal</span>
                  </div>
                </label>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem',
                  borderRadius: '8px', border: !binMatch ? '2px solid #DC2626' : '1px solid var(--border-color)',
                  backgroundColor: !binMatch ? '#FEF2F2' : '#FFFFFF', cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="binMatch" 
                    checked={binMatch === false} 
                    onChange={() => setBinMatch(false)} 
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#991B1B' }}>No — Report color mismatch</strong>
                    <span style={{ fontSize: '0.75rem', color: '#DC2626' }}>Discrepancy will be audited in compliance reports</span>
                  </div>
                </label>
              </div>

              {!binMatch && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Describe the mismatch / issue:
                  </label>
                  <textarea 
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Yellow bag found inside Blue bin, sharp placed in general bag..."
                    value={binMismatchNote}
                    onChange={e => setBinMismatchNote(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#F8FAFC' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setBinVerifyRecord(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                id="btn-confirm-disposal"
                className="btn btn-primary" 
                style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={confirmDisposal}
                disabled={actionLoading}
              >
                <CheckCircle size={15} /> Confirm &amp; Complete Disposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerAssignedPage;
