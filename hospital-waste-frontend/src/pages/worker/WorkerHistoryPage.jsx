import React, { useState, useEffect } from 'react';
import { History, Search, Filter, RefreshCw, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

const WorkerHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    fetchHistory();
  }, [search, selectedCategory, selectedRoom]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const query = {
        workerName: currentUser.name || '',
        workerId: currentUser.id || '',
        search,
        category: selectedCategory,
        room: selectedRoom
      };
      const data = await api.getCollectionHistory(query);
      setHistory(data);
    } catch (err) {
      console.error('Error loading collection history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Collection History</h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)' }}>
            Audit trail of completed collections and disposals for {currentUser.name || 'Sanitation Worker'}
          </p>
        </div>
        <button 
          id="btn-refresh-history"
          className="btn btn-outline" 
          onClick={fetchHistory}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} /> Refresh History
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div className="grid grid-cols-4" style={{ gap: '1rem', alignItems: 'center' }}>
          
          {/* Search by Record ID or Room */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              id="history-search-input"
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Record ID (e.g. WR-001) or Room..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter by Category */}
          <div>
            <select 
              id="history-category-filter"
              className="form-control"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Infectious Waste">Infectious Waste</option>
              <option value="Sharps">Sharps</option>
              <option value="Chemical Waste">Chemical Waste</option>
              <option value="General Waste">General Waste</option>
              <option value="Contaminated Recyclable">Contaminated Recyclable</option>
            </select>
          </div>

          {/* Filter by Room */}
          <div>
            <select 
              id="history-room-filter"
              className="form-control"
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
            >
              <option value="">All Rooms</option>
              <option value="Room 203">Room 203</option>
              <option value="Room 105">Room 105</option>
              <option value="Room 101">Room 101</option>
              <option value="ICU">ICU</option>
              <option value="ICU Bed 4">ICU Bed 4</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Operation Theatre">Operation Theatre</option>
              <option value="Pharmacy Store">Pharmacy Store</option>
              <option value="Emergency Ward A">Emergency Ward A</option>
              <option value="Oncology Ward">Oncology Ward</option>
            </select>
          </div>

        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '850px' }}>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Room Location</th>
                <th>Waste Category</th>
                <th>Weight</th>
                <th>Assigned Bin</th>
                <th>Collected At</th>
                <th>Disposed At</th>
                <th>Verification Note</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading collection history...</td></tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <CheckCircle size={32} color="#10B981" style={{ display: 'block', margin: '0 auto 0.5rem', opacity: 0.8 }} />
                    <strong style={{ display: 'block', color: '#334155', marginBottom: '0.25rem' }}>No Completed Collections Found</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No completed collection records match your current filter criteria for this worker account.</span>
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item._id || item.recordId}>
                    <td><strong>{item.recordId}</strong></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{item.room}</span></td>
                    <td style={{ fontSize: '0.88rem' }}>{item.category}</td>
                    <td>{item.weight} kg</td>
                    <td>
                      <span className={`bin-tag bin-${(item.assignedBin || '').toLowerCase()}`}>
                        {item.assignedBin}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {item.collectedAt ? formatDateTime(item.collectedAt) : '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {item.completedAt ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>{formatDateTime(item.completedAt)}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{formatDateTime(item.collectedAt)}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.binMismatchNote ? (
                        <span style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <AlertTriangle size={13} /> {item.binMismatchNote}
                        </span>
                      ) : item.binVerified ? (
                        <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ShieldCheck size={13} /> Verified Match
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Standard</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Disposed
                      </span>
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

export default WorkerHistoryPage;
