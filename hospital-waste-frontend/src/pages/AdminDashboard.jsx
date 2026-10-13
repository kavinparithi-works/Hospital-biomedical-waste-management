import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Activity, Trash2, Truck, CheckCircle, Users, Plus, X, AlertCircle, 
  Calendar, Clock, Edit2, UserCheck, UserX, Trash, Search, ChevronLeft, ChevronRight, Filter,
  Building, ShieldCheck, Mail, Phone, Lock, Save, Bell, CheckSquare, Award, ArrowLeft,
  TrendingUp, Download, RefreshCw, CheckCircle2, ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

// Custom SaaS Tooltip for AreaChart
const CustomSaaSTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        padding: '0.85rem 1rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
        border: '1px solid #334155',
        fontSize: '0.82rem',
        minWidth: '200px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '0.45rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.35rem', color: '#94A3B8' }}>
          📅 {label} Generation Audit
        </div>
        {payload.map((entry, index) => (
          <div key={`tip-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.3rem 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#CBD5E1' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
              {entry.name}:
            </span>
            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{Number(entry.value).toFixed(1)} kg</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active view based on path
  const path = location.pathname;
  let activeTab = 'dashboard';
  if (path.includes('/users')) activeTab = 'users';
  else if (path.includes('/settings')) activeTab = 'settings';

  // Data States
  const [users, setUsers] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [previousPendingRecords, setPreviousPendingRecords] = useState([]);
  const [stats, setStats] = useState({
    totalWeight: 0,
    pendingCount: 0,
    collectedCount: 0,
    complianceRate: 95,
    todayTotalRecords: 0,
    todayPending: 0,
    todayCompleted: 0,
    previousDaysPending: 0,
    recentActivity: [],
    weeklyChartData: []
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Executive SaaS Dashboard Interactive States
  const [dashboardTimeframe, setDashboardTimeframe] = useState('7D');
  const [recordTabFilter, setRecordTabFilter] = useState('all');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordCategoryFilter, setRecordCategoryFilter] = useState('all');

  // User Management State & Subviews
  const [userViewMode, setUserViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'overview';
  });
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Separate pagination states for Staff and Worker detail sub-views
  const [staffPage, setStaffPage] = useState(1);
  const [workerPage, setWorkerPage] = useState(1);
  const detailPageSize = 10;

  // Add / Edit User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff',
    department: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Settings State — KMCH Hospital
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [adminProfile, setAdminProfile] = useState({
    name: currentUser.name || 'System Admin',
    email: currentUser.email || 'admin@kmch.ac.in',
    hospitalName: 'KMCH Hospital (Kovai Medical Center & Hospital)',
    hospitalId: 'KMCH-BMWM-2026',
    phone: currentUser.phone || '+91 422 4323800',
    department: currentUser.department || 'Administration'
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    dailyReportSummary: true,
    urgentSharpsAlert: true
  });

  // Date Selection State (defaulting to today YYYY-MM-DD in IST)
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [dashboardRecords, setDashboardRecords] = useState([]);

  useEffect(() => {
    fetchUsersData();
  }, [userRoleFilter, userStatusFilter, userSearchTerm]);

  // Fetch stats & records for selected date using AbortController to prevent race conditions
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const loadDashboardData = async () => {
      try {
        setLoadingStats(true);
        const [statsData, recordsData] = await Promise.all([
          api.getWasteStats(selectedDate, signal),
          api.getWasteRecordsByDate(selectedDate, signal)
        ]);
        if (!signal.aborted) {
          setStats(statsData);
          setDashboardRecords(recordsData);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error loading dashboard data:', err);
        }
      } finally {
        if (!signal.aborted) {
          setLoadingStats(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  const handleSelectToday = () => setSelectedDate(getTodayDateStr());
  const handleSelectYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };
  const handleSelectLast7Days = () => setSelectedDate(getTodayDateStr());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'staff' || view === 'worker') {
      setUserViewMode(view);
    } else if (view === 'overview' || (!view && path.includes('/users') && userViewMode === 'overview')) {
      setUserViewMode('overview');
    }
  }, [location.search, path]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, userViewMode]);

  const fetchUsersData = async () => {
    try {
      setLoadingUsers(true);
      const query = {};
      if (userRoleFilter !== 'all') query.role = userRoleFilter;
      if (userStatusFilter !== 'all') query.status = userStatusFilter;
      if (userSearchTerm) query.search = userSearchTerm;

      const data = await api.getUsers(query);
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStatsData = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getWasteStats(selectedDate);
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchDailyRecords = async () => {
    try {
      const records = await api.getWasteRecordsByDate(selectedDate);
      setDashboardRecords(records);
    } catch (err) {
      console.error('Error loading daily waste records:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newUser.name || (!editingUser && !newUser.email) || (!editingUser && !newUser.password) || !newUser.phone) {
      setFormError('Name, Email, Password, and Phone are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await api.updateUser(editingUser._id, {
          name: newUser.name,
          phone: newUser.phone,
          department: newUser.department,
          role: newUser.role,
          password: newUser.password
        });
        setFormSuccess(`User ${newUser.name} details & password updated successfully!`);
      } else {
        const res = await api.createUser({
          name: newUser.name,
          email: newUser.email,
          username: newUser.email,
          password: newUser.password,
          phone: newUser.phone,
          role: newUser.role,
          department: newUser.department || (newUser.role === 'staff' ? 'Medical Ward' : 'Logistics')
        });
        setFormSuccess(`User ${res.user.name} created successfully!`);
      }

      setNewUser({ name: '', email: '', password: '', phone: '', role: 'staff', department: '' });
      setEditingUser(null);
      await fetchUsersData();
      
      setTimeout(() => {
        setShowAddUserModal(false);
        setFormSuccess('');
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setNewUser({
      name: u.name || '',
      email: u.email || u.username || '',
      password: '',
      phone: u.phone || '',
      role: u.role || 'staff',
      department: u.department || ''
    });
    setFormError('');
    setFormSuccess('');
    setShowAddUserModal(true);
  };

  const handleToggleActive = async (user) => {
    try {
      await api.toggleUserActive(user._id);
      await fetchUsersData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.name}"?`)) return;
    try {
      await api.deleteUser(user._id);
      await fetchUsersData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Pagination calculation for User Management (Exactly 10 per page)
  const totalPages = Math.ceil(users.length / usersPerPage) || 1;
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  // Filter records for selected date by tab, category, and search keyword
  const filteredDashboardRecords = dashboardRecords.filter(record => {
    // Tab filter
    if (recordTabFilter === 'pending') {
      if (record.status !== 'Pending' && record.status !== 'Assigned') return false;
    } else if (recordTabFilter === 'completed') {
      if (record.status !== 'Completed' && record.status !== 'Collected') return false;
    }

    // Category filter
    if (recordCategoryFilter !== 'all') {
      if ((record.category || '').toLowerCase() !== recordCategoryFilter.toLowerCase()) return false;
    }

    // Search filter
    if (recordSearch.trim()) {
      const q = recordSearch.toLowerCase();
      const matchId = (record.recordId || '').toLowerCase().includes(q);
      const matchRoom = (record.room || '').toLowerCase().includes(q);
      const matchCat = (record.category || '').toLowerCase().includes(q);
      const matchStaff = (record.createdBy || '').toLowerCase().includes(q);
      if (!matchId && !matchRoom && !matchCat && !matchStaff) return false;
    }

    return true;
  });

  // Export CSV handler
  const handleExportCSV = () => {
    if (filteredDashboardRecords.length === 0) {
      alert('No waste records available to export.');
      return;
    }
    const headers = ['Record ID', 'Room / Ward', 'Category', 'Weight (kg)', 'Assigned Bin', 'Status', 'Logged By', 'Date'];
    const rows = filteredDashboardRecords.map(r => [
      r.recordId || r._id,
      `"${r.room || 'General Ward'}"`,
      `"${r.category || 'General Waste'}"`,
      r.weight || 0,
      r.assignedBin || 'Yellow',
      r.status || 'Pending',
      `"${r.createdBy || 'Medical Staff'}"`,
      `"${new Date(r.createdAt || Date.now()).toLocaleDateString()}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KMCH_BioWaste_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Refresh handler with spin animation
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStatsData(), fetchDailyRecords(), fetchUsersData()]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Dynamic Recharts Data matching daily database entries for Sun-Sat
  const chartData = (stats.weeklyChartData && stats.weeklyChartData.length > 0)
    ? stats.weeklyChartData
    : [
        { name: 'Sun', infectious: 0, sharps: 0, general: 0 },
        { name: 'Mon', infectious: 0, sharps: 0, general: 0 },
        { name: 'Tue', infectious: 0, sharps: 0, general: 0 },
        { name: 'Wed', infectious: 0, sharps: 0, general: 0 },
        { name: 'Thu', infectious: 0, sharps: 0, general: 0 },
        { name: 'Fri', infectious: 0, sharps: 0, general: 0 },
        { name: 'Sat', infectious: 0, sharps: 0, general: 0 },
      ];

  // Donut Category Distribution calculated dynamically from actual selected date records
  const totalWeightForSelectedDate = dashboardRecords.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  
  const infWeight = dashboardRecords
    .filter(r => r.category === 'Infectious Waste' || r.assignedBin === 'Yellow')
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const redWeight = dashboardRecords
    .filter(r => r.category === 'Contaminated Plastic' || r.assignedBin === 'Red')
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const blueWeight = dashboardRecords
    .filter(r => r.category === 'Glassware & Vials' || r.assignedBin === 'Blue' || r.category === 'General Waste' || r.assignedBin === 'Green')
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const sharpsWeight = dashboardRecords
    .filter(r => r.category === 'Sharps' || r.assignedBin === 'White')
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

  const categoryDistribution = [
    {
      name: 'Infectious & Anatomical',
      color: '#F59E0B',
      bin: 'Yellow',
      share: totalWeightForSelectedDate > 0 ? Math.round((infWeight / totalWeightForSelectedDate) * 100) : 0,
      weight: infWeight.toFixed(1)
    },
    {
      name: 'Contaminated Plastic',
      color: '#EF4444',
      bin: 'Red',
      share: totalWeightForSelectedDate > 0 ? Math.round((redWeight / totalWeightForSelectedDate) * 100) : 0,
      weight: redWeight.toFixed(1)
    },
    {
      name: 'Glassware & Vials',
      color: '#3B82F6',
      bin: 'Blue',
      share: totalWeightForSelectedDate > 0 ? Math.round((blueWeight / totalWeightForSelectedDate) * 100) : 0,
      weight: blueWeight.toFixed(1)
    },
    {
      name: 'Sharps & Needles',
      color: '#64748B',
      bin: 'White',
      share: totalWeightForSelectedDate > 0 ? Math.round((sharpsWeight / totalWeightForSelectedDate) * 100) : 0,
      weight: sharpsWeight.toFixed(1)
    },
  ];

  const donutChartData = totalWeightForSelectedDate > 0
    ? categoryDistribution.map(c => ({ name: c.name, value: c.share, color: c.color }))
    : [{ name: 'No Records', value: 100, color: '#E2E8F0' }];

  // Helper date string
  const todayDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Reports & Analytics Chart Data ──────────────────────────────────
  const COLORS = ['#27AE60', '#E74C3C', '#3498DB', '#F39C12'];
  const complianceChartData = [
    { name: 'Compliant', value: Math.round(stats.complianceRate || 95) },
    { name: 'Non-Compliant', value: 100 - Math.round(stats.complianceRate || 95) }
  ];

  // ── Filtered Staff List (for paginated sub-view) ────────────────────
  const filteredStaff = users
    .filter(u => u.role === 'staff')
    .filter(u => !userSearchTerm ||
      (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(userSearchTerm.toLowerCase()))
    )
    .filter(u => userStatusFilter === 'all' || (userStatusFilter === 'active' ? u.isActive !== false : u.isActive === false));

  const staffTotalPages = Math.ceil(filteredStaff.length / detailPageSize) || 1;
  const paginatedStaff = filteredStaff.slice((staffPage - 1) * detailPageSize, staffPage * detailPageSize);

  // ── Filtered Worker List (for paginated sub-view) ───────────────────
  const filteredWorkers = users
    .filter(u => u.role === 'worker')
    .filter(u => !userSearchTerm ||
      (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(userSearchTerm.toLowerCase()))
    )
    .filter(u => userStatusFilter === 'all' || (userStatusFilter === 'active' ? u.isActive !== false : u.isActive === false));

  const workerTotalPages = Math.ceil(filteredWorkers.length / detailPageSize) || 1;
  const paginatedWorkers = filteredWorkers.slice((workerPage - 1) * detailPageSize, workerPage * detailPageSize);

  return (
    <div className="fade-in">
      
      {/* =========================================================
          VIEW 1: ADMIN DASHBOARD (EXECUTIVE SAAS REVENUE ANALYTICS LAYOUT)
         ========================================================= */}
      {activeTab === 'dashboard' && (
        <div>
          {/* SaaS Executive Top Header Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
                  KMCH BIOWASTE CLOUD
                </span>
                <span style={{ color: '#CBD5E1' }}>/</span>
                <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>
                  EXECUTIVE DASHBOARD
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  marginLeft: '0.35rem'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                  Real-time Sync
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
                Biomedical Waste Analytics
              </h1>
              <p style={{ margin: '0.15rem 0 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                Real-time volume tracking, statutory segregation compliance audit & collection velocity
              </p>
            </div>

            {/* Top Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Interactive Date Picker & Quick Filter Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '10px',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
                }}>
                  <Calendar size={15} color="#2563EB" />
                  <input
                    type="date"
                    id="admin-date-picker"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#334155',
                      fontFamily: 'inherit',
                      backgroundColor: 'transparent',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Refresh Action */}
              <button 
                onClick={handleRefreshAll}
                title="Refresh Analytics Data"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                <RefreshCw size={15} color="#2563EB" style={{ animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none' }} />
                <span>Sync</span>
              </button>

              {/* Export CSV Report */}
              <button 
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={15} />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>

          {/* SaaS Executive KPI Metrics (4 Primary Cards) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1.25rem', 
            marginBottom: '1.5rem' 
          }}>
            {/* Card 1: Total Waste Volume */}
            <div className="card" style={{ padding: '1.25rem 1.35rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={20} color="#2563EB" />
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0'
                }}>
                  <TrendingUp size={13} /> +8.4%
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total BioWaste Volume
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                {loadingStats ? '...' : `${stats.totalWeight || 0} kg`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>
                Across all hospital active wards
              </div>
              {/* Metric Progress Line */}
              <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '0.85rem', overflow: 'hidden' }}>
                <div style={{ width: '74%', height: '100%', background: 'linear-gradient(90deg, #2563EB, #60A5FA)', borderRadius: '3px' }}></div>
              </div>
            </div>

            {/* Card 2: Segregation Compliance Rate */}
            <div className="card" style={{ padding: '1.25rem 1.35rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={20} color="#059669" />
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0'
                }}>
                  <CheckCircle2 size={13} /> +2.1%
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Segregation Compliance
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                {loadingStats ? '...' : `${stats.complianceRate || 96.5}%`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>
                CPCB Statutory Benchmark: &gt;90%
              </div>
              {/* Metric Progress Line */}
              <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '0.85rem', overflow: 'hidden' }}>
                <div style={{ width: `${stats.complianceRate || 96.5}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: '3px' }}></div>
              </div>
            </div>

            {/* Card 3: Today's Clearance Velocity */}
            <div className="card" style={{ padding: '1.25rem 1.35rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#F5F3FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={20} color="#7C3AED" />
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE'
                }}>
                  <Clock size={13} /> {stats.todayPending || 0} Pending
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Day's Clearance
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                {loadingStats ? '...' : `${stats.todayCompleted || 0} / ${stats.todayTotalRecords || (stats.todayCompleted + stats.todayPending || 0)}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>
                Turnaround latency: ~1.4 hrs avg
              </div>
              {/* Metric Progress Line */}
              <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '0.85rem', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats.todayTotalRecords > 0 ? Math.round((stats.todayCompleted / stats.todayTotalRecords) * 100) : 82}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', 
                  borderRadius: '3px' 
                }}></div>
              </div>
            </div>

            {/* Card 4: Previous Days' Pending Backlog */}
            <div className="card" style={{ padding: '1.25rem 1.35rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: stats.previousDaysPending > 0 ? '#FEF2F2' : '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertCircle size={20} color={stats.previousDaysPending > 0 ? '#DC2626' : '#059669'} />
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  backgroundColor: stats.previousDaysPending > 0 ? '#FEF2F2' : '#ECFDF5',
                  color: stats.previousDaysPending > 0 ? '#DC2626' : '#059669',
                  border: `1px solid ${stats.previousDaysPending > 0 ? '#FECACA' : '#A7F3D0'}`
                }}>
                  {stats.previousDaysPending === 0 ? 'Optimal Safety' : 'Attention Needed'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Backlog / Overdue Lots
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stats.previousDaysPending > 0 ? '#DC2626' : '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                {loadingStats ? '...' : `${stats.previousDaysPending || 0} Lots`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>
                {stats.previousDaysPending === 0 ? 'Zero overdue disposal breaches' : 'Pending sanitation collection'}
              </div>
              {/* Metric Progress Line */}
              <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '0.85rem', overflow: 'hidden' }}>
                <div style={{ 
                  width: stats.previousDaysPending === 0 ? '100%' : '35%', 
                  height: '100%', 
                  background: stats.previousDaysPending === 0 ? '#10B981' : '#EF4444', 
                  borderRadius: '3px' 
                }}></div>
              </div>
            </div>
          </div>

          {/* SaaS Signature Analytics Grid (2-Column: Main AreaChart + Donut Breakdown) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.85fr 1.15fr', 
            gap: '1.25rem', 
            marginBottom: '1.5rem' 
          }}>
            {/* Primary Visual: AreaChart Trends */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Biomedical Waste Generation &amp; Segregation Trends</span>
                    {stats.weekRangeLabel && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                        📅 Week of {stats.weekRangeLabel}
                      </span>
                    )}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                    Daily volume tracking by hazard category across hospital wards
                  </p>
                </div>

                {/* Timeframe Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '8px' }}>
                  {['1D', '7D', '30D', '1Y'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => setDashboardTimeframe(tf)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: dashboardTimeframe === tf ? '#FFFFFF' : 'transparent',
                        color: dashboardTimeframe === tf ? '#2563EB' : '#64748B',
                        boxShadow: dashboardTimeframe === tf ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Legend Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#64748B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
                  <strong style={{ color: '#0F172A' }}>Infectious (Yellow)</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                  <strong style={{ color: '#0F172A' }}>General & Plastic (Green)</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#64748B' }}></span>
                  <strong style={{ color: '#0F172A' }}>Sharps (White)</strong>
                </span>
              </div>

              {/* Chart Canvas */}
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="infectiousGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="generalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="sharpsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#64748B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} unit="kg" />
                    <Tooltip content={<CustomSaaSTooltip />} />
                    <Area type="monotone" dataKey="infectious" name="Infectious (Yellow)" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#infectiousGrad)" />
                    <Area type="monotone" dataKey="general" name="General & Plastic" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#generalGrad)" />
                    <Area type="monotone" dataKey="sharps" name="Sharps (White)" stroke="#64748B" strokeWidth={2} fillOpacity={1} fill="url(#sharpsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Secondary Visual: Donut Category Breakdown */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                  Hazard Classification Ratio
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Share by statutory bin standard
                </p>
              </div>

              {/* Donut Chart with Center Metric */}
              <div style={{ position: 'relative', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutChartData}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell key={`donut-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label in Donut Hole */}
                <div style={{
                  position: 'absolute',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                    {stats.totalWeight || 0} kg
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Logged
                  </div>
                </div>
              </div>

              {/* Category Breakdown Progress Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {categoryDistribution.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }}></span>
                        {cat.name}
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        {cat.share}% <span style={{ color: '#64748B', fontWeight: 500, fontSize: '0.75rem' }}>({cat.weight} kg)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${cat.share}%`, height: '100%', backgroundColor: cat.color, borderRadius: '2px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Records Activity Stream (SaaS Transactions Table) */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            {/* Table Header & Segmented Tabs */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                  Operational Waste Log Stream
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Live auditable records with QR serialization and staff attribution
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
                {[
                  { key: 'all', label: `All Records (${dashboardRecords.length})` },
                  { key: 'pending', label: `Pending (${dashboardRecords.filter(r => r.status === 'Pending' || r.status === 'Assigned').length})` },
                  { key: 'completed', label: `Completed (${dashboardRecords.filter(r => r.status === 'Completed' || r.status === 'Collected').length})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setRecordTabFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: recordTabFilter === tab.key ? '#FFFFFF' : 'transparent',
                      color: recordTabFilter === tab.key ? '#2563EB' : '#64748B',
                      boxShadow: recordTabFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ 
                position: 'relative', 
                flex: 1, 
                minWidth: '240px' 
              }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by Record ID, Ward, Room or Staff..."
                  value={recordSearch}
                  onChange={e => setRecordSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    transition: 'border-color 0.15s ease'
                  }}
                />
              </div>

              {/* Category Filter */}
              <select
                value={recordCategoryFilter}
                onChange={e => setRecordCategoryFilter(e.target.value)}
                style={{
                  padding: '0.55rem 2rem 0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.85rem',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Waste Categories</option>
                <option value="Infectious Waste">Infectious Waste (Yellow)</option>
                <option value="Sharps">Sharps & Blades (White)</option>
                <option value="General Waste">General / Plastic Waste</option>
              </select>
            </div>

            {/* Table Container */}
            <div className="table-container" style={{ border: '1px solid #EAECF0', borderRadius: '12px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Room Location</th>
                    <th>Waste Category</th>
                    <th>Weight</th>
                    <th>Assigned Bin</th>
                    <th>Logged By</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDashboardRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748B' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={32} color="#10B981" />
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>
                            No waste bin records logged for {selectedDate}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                            All clear! Select another date from the calendar to view historical records or pending lots.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDashboardRecords.slice(0, 15).map(r => (
                      <tr key={r._id || r.recordId} style={{ transition: 'background-color 0.1s ease' }}>
                        {/* Monospace Record ID */}
                        <td>
                          <span style={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 700, 
                            color: '#1E293B',
                            backgroundColor: '#F1F5F9',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.82rem'
                          }}>
                            {r.recordId || r._id?.substring(0, 8)}
                          </span>
                        </td>
                        {/* Room Location */}
                        <td>
                          <span style={{ fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building size={14} color="#64748B" />
                            {r.room || 'Ward Room'}
                          </span>
                        </td>
                        {/* Waste Category */}
                        <td>
                          <span style={{ fontWeight: 500, color: '#334155' }}>
                            {r.category || 'General Waste'}
                          </span>
                        </td>
                        {/* Weight */}
                        <td>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.weight} kg
                          </span>
                        </td>
                        {/* Bin Tag */}
                        <td>
                          <span className={`bin-tag bin-${(r.assignedBin || 'Yellow').toLowerCase()}`}>
                            {r.assignedBin || 'Yellow'}
                          </span>
                        </td>
                        {/* Logged By Avatar */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#E0E7FF',
                              color: '#3730A3',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {(r.createdBy || 'Staff').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                              {r.createdBy || 'Medical Staff'}
                            </span>
                          </div>
                        </td>
                        {/* Status Badge */}
                        <td>
                          <span className={`badge ${
                            r.status === 'Completed' ? 'badge-success' : 
                            r.status === 'Collected' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {r.status === 'Completed' && <CheckCircle2 size={12} />}
                            {r.status === 'Collected' && <Truck size={12} />}
                            {r.status === 'Pending' && <Clock size={12} />}
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.82rem', color: '#64748B' }}>
              <span>
                Showing {Math.min(15, filteredDashboardRecords.length)} of {filteredDashboardRecords.length} records
              </span>
              <button
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                <Download size={14} /> Download full log report (.CSV)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: USER MANAGEMENT (NAVS TO TOP FRESH PAGE)
         ========================================================= */}
      {activeTab === 'users' && (
        <div>
          {/* SUBVIEW A: DEDICATED MEDICAL STAFF DETAILS */}
          {userViewMode === 'staff' && (
            <div>
              {/* Header & Back Nav */}
              <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => {
                      setUserViewMode('overview');
                      navigate('/admin/users');
                    }}
                  >
                    <ArrowLeft size={16} /> Back to User Overview
                  </button>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.55rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>👨‍⚕️</span> KMCH HOSPITAL — Medical Staff Details
                    </h1>
                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Review doctor & nursing personnel profiles, monitor waste logging activity, and alter credentials
                    </p>
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.5rem 1.25rem', backgroundColor: '#27AE60', borderColor: '#27AE60' }}
                  onClick={() => {
                    setEditingUser(null);
                    setNewUser({ name: '', email: '', password: '', phone: '', role: 'staff', department: 'General Medicine' });
                    setFormError('');
                    setFormSuccess('');
                    setShowAddUserModal(true);
                  }}
                >
                  <Plus size={18} /> Add New Medical Staff
                </button>
              </div>

              {/* Medical Staff KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card stat-card" style={{ borderLeft: '4px solid #27AE60' }}>
                  <div className="stat-icon stat-green"><Users size={22} /></div>
                  <div className="stat-details">
                    <h4>Total Medical Staff</h4>
                    <div className="value">{users.filter(u => u.role === 'staff').length}</div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #2ECC71' }}>
                  <div className="stat-icon stat-green"><CheckCircle size={22} /></div>
                  <div className="stat-details">
                    <h4>Active On Duty</h4>
                    <div className="value">{users.filter(u => u.role === 'staff' && u.isActive !== false).length}</div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #3498DB' }}>
                  <div className="stat-icon stat-blue"><Building size={22} /></div>
                  <div className="stat-details">
                    <h4>Departments</h4>
                    <div className="value">
                      {new Set(users.filter(u => u.role === 'staff').map(u => u.department || 'General')).size}
                    </div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #9B59B6' }}>
                  <div className="stat-icon stat-blue"><Calendar size={22} /></div>
                  <div className="stat-details">
                    <h4>Logged Today</h4>
                    <div className="value">{todayRecords.length} Records</div>
                  </div>
                </div>
              </div>

              {/* Staff Table Card */}
              <div className="card">
                <div className="flex gap-3" style={{ padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Search medical staff by name, email, department..." 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem' }}
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Email / Login</th>
                        <th>Phone Number</th>
                        <th>Department / Ward</th>
                        <th>Hospital Role</th>
                        <th>Account Status</th>
                        <th style={{ textAlign: 'right' }}>Alter & Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading KMCH medical staff...</td></tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No medical staff found in database.</td></tr>
                      ) : (
                        paginatedStaff.map(u => (
                            <tr key={u._id || u.email}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#DCFCE7', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                    {(u.name || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong>{u.name}</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KMCH Medical Personnel</div>
                                  </div>
                                </div>
                              </td>
                              <td><code>{u.email || u.username}</code></td>
                              <td>{u.phone || 'N/A'}</td>
                              <td>
                                <span className="badge badge-info" style={{ backgroundColor: 'rgba(52, 152, 219, 0.12)', color: '#2980B9' }}>
                                  {u.department || 'General Ward'}
                                </span>
                              </td>
                              <td><span className="badge badge-success">Medical Staff</span></td>
                              <td>
                                {u.isActive === false ? (
                                  <span className="badge badge-danger">Inactive</span>
                                ) : (
                                  <span className="badge badge-success">Active</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    className="btn"
                                    title="Alter Staff Details"
                                    style={{
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.82rem',
                                      backgroundColor: '#F0FDF4',
                                      color: '#166534',
                                      border: '1px solid #86EFAC',
                                      borderRadius: '6px',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleEditClick(u)}
                                  >
                                    <Edit2 size={13} /> Alter Details
                                  </button>

                                  <button 
                                    className={`btn ${u.isActive === false ? 'btn-success' : 'btn-outline'}`}
                                    title={u.isActive === false ? "Activate Account" : "Deactivate Account"}
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                    onClick={() => handleToggleActive(u)}
                                  >
                                    {u.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                                  </button>

                                  <button 
                                    className="btn btn-outline"
                                    title="Delete User"
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#E74C3C', borderColor: '#E74C3C' }}
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Staff Pagination Controls */}
                {filteredStaff.length > detailPageSize && (
                  <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #E0E6ED', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Showing {(staffPage - 1) * detailPageSize + 1}–{Math.min(staffPage * detailPageSize, filteredStaff.length)} of {filteredStaff.length} medical staff
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                        disabled={staffPage <= 1}
                        onClick={() => setStaffPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={15} /> Prev
                      </button>
                      {Array.from({ length: staffTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === staffTotalPages || Math.abs(p - staffPage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === '...' ? (
                            <span key={`dot-${i}`} style={{ padding: '0.35rem 0.3rem', color: '#94A3B8' }}>…</span>
                          ) : (
                            <button
                              key={p}
                              className={`btn ${staffPage === p ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem', minWidth: '36px' }}
                              onClick={() => setStaffPage(p)}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                        disabled={staffPage >= staffTotalPages}
                        onClick={() => setStaffPage(p => Math.min(staffTotalPages, p + 1))}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBVIEW B: DEDICATED SANITATION WORKER DETAILS */}
          {userViewMode === 'worker' && (
            <div>
              {/* Header & Back Nav */}
              <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => {
                      setUserViewMode('overview');
                      navigate('/admin/users');
                    }}
                  >
                    <ArrowLeft size={16} /> Back to User Overview
                  </button>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.55rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🧹</span> KMCH HOSPITAL — Sanitation Worker Details
                    </h1>
                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Review waste pickup personnel profiles, assigned collection zones, and alter credentials
                    </p>
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.5rem 1.25rem', backgroundColor: '#E67E22', borderColor: '#E67E22' }}
                  onClick={() => {
                    setEditingUser(null);
                    setNewUser({ name: '', email: '', password: '', phone: '', role: 'worker', department: 'Ward 2 & ICU Zone' });
                    setFormError('');
                    setFormSuccess('');
                    setShowAddUserModal(true);
                  }}
                >
                  <Plus size={18} /> Add New Sanitation Worker
                </button>
              </div>

              {/* Sanitation Worker KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card stat-card" style={{ borderLeft: '4px solid #E67E22' }}>
                  <div className="stat-icon stat-yellow"><Truck size={22} /></div>
                  <div className="stat-details">
                    <h4>Total Sanitation Workers</h4>
                    <div className="value">{users.filter(u => u.role === 'worker').length}</div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #2ECC71' }}>
                  <div className="stat-icon stat-green"><CheckCircle size={22} /></div>
                  <div className="stat-details">
                    <h4>Active on Duty</h4>
                    <div className="value">{users.filter(u => u.role === 'worker' && u.isActive !== false).length}</div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #3498DB' }}>
                  <div className="stat-icon stat-blue"><Building size={22} /></div>
                  <div className="stat-details">
                    <h4>Pickup Zones Covered</h4>
                    <div className="value">
                      {new Set(users.filter(u => u.role === 'worker').map(u => u.department || 'Logistics')).size}
                    </div>
                  </div>
                </div>
                <div className="card stat-card" style={{ borderLeft: '4px solid #1ABC9C' }}>
                  <div className="stat-icon stat-green"><CheckCircle size={22} /></div>
                  <div className="stat-details">
                    <h4>Pickups Completed</h4>
                    <div className="value">{stats.collectedCount ?? 0} Completed</div>
                  </div>
                </div>
              </div>

              {/* Worker Table Card */}
              <div className="card">
                <div className="flex gap-3" style={{ padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Search sanitation worker by name, phone, zone..." 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem' }}
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sanitation Worker</th>
                        <th>Email / Login</th>
                        <th>Phone Number</th>
                        <th>Assigned Area / Shift</th>
                        <th>Role</th>
                        <th>Account Status</th>
                        <th style={{ textAlign: 'right' }}>Alter & Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading KMCH sanitation workers...</td></tr>
                      ) : filteredWorkers.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No sanitation workers found in database.</td></tr>
                      ) : (
                        paginatedWorkers.map(u => (
                            <tr key={u._id || u.email}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#FEF3C7', color: '#92400E', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                    {(u.name || 'W').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong>{u.name}</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KMCH Sanitation Staff</div>
                                  </div>
                                </div>
                              </td>
                              <td><code>{u.email || u.username}</code></td>
                              <td>{u.phone || 'N/A'}</td>
                              <td>
                                <span className="badge badge-warning" style={{ backgroundColor: 'rgba(230, 126, 34, 0.12)', color: '#E67E22' }}>
                                  {u.department || 'All Wards'}
                                </span>
                              </td>
                              <td><span className="badge badge-warning">Sanitation Worker</span></td>
                              <td>
                                {u.isActive === false ? (
                                  <span className="badge badge-danger">Inactive</span>
                                ) : (
                                  <span className="badge badge-success">Active</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    className="btn"
                                    title="Alter Worker Details"
                                    style={{
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.82rem',
                                      backgroundColor: '#FFFBEB',
                                      color: '#92400E',
                                      border: '1px solid #FCD34D',
                                      borderRadius: '6px',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleEditClick(u)}
                                  >
                                    <Edit2 size={13} /> Alter Details
                                  </button>

                                  <button 
                                    className={`btn ${u.isActive === false ? 'btn-success' : 'btn-outline'}`}
                                    title={u.isActive === false ? "Activate Account" : "Deactivate Account"}
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                    onClick={() => handleToggleActive(u)}
                                  >
                                    {u.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                                  </button>

                                  <button 
                                    className="btn btn-outline"
                                    title="Delete User"
                                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#E74C3C', borderColor: '#E74C3C' }}
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Worker Pagination Controls */}
                {filteredWorkers.length > detailPageSize && (
                  <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #E0E6ED', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Showing {(workerPage - 1) * detailPageSize + 1}–{Math.min(workerPage * detailPageSize, filteredWorkers.length)} of {filteredWorkers.length} sanitation workers
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                        disabled={workerPage <= 1}
                        onClick={() => setWorkerPage(p => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={15} /> Prev
                      </button>
                      {Array.from({ length: workerTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === workerTotalPages || Math.abs(p - workerPage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === '...' ? (
                            <span key={`dot-${i}`} style={{ padding: '0.35rem 0.3rem', color: '#94A3B8' }}>…</span>
                          ) : (
                            <button
                              key={p}
                              className={`btn ${workerPage === p ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem', minWidth: '36px' }}
                              onClick={() => setWorkerPage(p)}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                        disabled={workerPage >= workerTotalPages}
                        onClick={() => setWorkerPage(p => Math.min(workerTotalPages, p + 1))}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBVIEW C: ALL USERS OVERVIEW */}
          {userViewMode === 'overview' && (
            <div>
              {/* Header */}
              <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h1 style={{ margin: 0 }}>KMCH HOSPITAL — User Management</h1>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>
                    Manage Medical Staff and Sanitation Worker accounts stored in MongoDB ({users.length} registered users)
                  </p>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '0.5rem 1.25rem' }}
                  onClick={() => {
                    setEditingUser(null);
                    setNewUser({ name: '', email: '', password: '', phone: '', role: 'staff', department: '' });
                    setFormError('');
                    setFormSuccess('');
                    setShowAddUserModal(true);
                  }}
                >
                  <Plus size={18} /> Add New User
                </button>
              </div>

              {/* Two Prominent Action Cards for Medical Staff Details & Sanitation Worker Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div 
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '12px',
                    borderLeft: '5px solid #27AE60',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
                    boxShadow: '0 4px 14px rgba(39, 174, 96, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                        👨‍⚕️
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#14532D', fontWeight: 700 }}>Medical Staff Details</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#166534' }}>
                          KMCH Doctors, Nurses & Ward Officers
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      {users.filter(u => u.role === 'staff').length} Members
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.86rem', color: '#374151', lineHeight: '1.45' }}>
                    Click to go inside and review full medical staff roster, departmental records, and alter profile details.
                  </div>

                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#27AE60',
                      color: '#FFF',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      marginTop: '0.25rem',
                      boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                    onClick={() => {
                      setUserViewMode('staff');
                      navigate('/admin/users?view=staff');
                    }}
                  >
                    👨‍⚕️ Go Inside Medical Staff Details & Alter →
                  </button>
                </div>

                <div 
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '12px',
                    borderLeft: '5px solid #E67E22',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
                    boxShadow: '0 4px 14px rgba(230, 126, 34, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                        🧹
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#78350F', fontWeight: 700 }}>Sanitation Worker Details</h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#92400E' }}>
                          KMCH Waste Pickup & Disposal Crew
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      {users.filter(u => u.role === 'worker').length} Members
                    </span>
                  </div>

                  <div style={{ fontSize: '0.86rem', color: '#374151', lineHeight: '1.45' }}>
                    Click to go inside and review full sanitation worker roster, collection areas, and alter profile details.
                  </div>

                  <button
                    className="btn"
                    style={{
                      backgroundColor: '#E67E22',
                      color: '#FFF',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      marginTop: '0.25rem',
                      boxShadow: '0 2px 8px rgba(230, 126, 34, 0.3)',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                    onClick={() => {
                      setUserViewMode('worker');
                      navigate('/admin/users?view=worker');
                    }}
                  >
                    🧹 Go Inside Sanitation Worker Details & Alter →
                  </button>
                </div>
              </div>

              {/* Direct Tab Navigation Buttons */}
              <div className="flex gap-3" style={{ marginBottom: '1.25rem' }}>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: userRoleFilter === 'all' ? 'var(--primary-blue, #2980B9)' : '#FFF',
                    color: userRoleFilter === 'all' ? '#FFF' : 'var(--text-dark)',
                    border: '2px solid var(--primary-blue, #2980B9)',
                    boxShadow: userRoleFilter === 'all' ? '0 4px 12px rgba(41, 128, 185, 0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => { setUserRoleFilter('all'); setCurrentPage(1); }}
                >
                  <Users size={18} /> All Users ({users.length})
                </button>

                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#FFF',
                    color: '#27AE60',
                    border: '2px solid #27AE60',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => { setUserViewMode('staff'); navigate('/admin/users?view=staff'); }}
                >
                  👨‍⚕️ <strong>Medical Staff Details ({users.filter(u => u.role === 'staff').length})</strong>
                </button>

                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#FFF',
                    color: '#E67E22',
                    border: '2px solid #E67E22',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => { setUserViewMode('worker'); navigate('/admin/users?view=worker'); }}
                >
                  🧹 <strong>Sanitation Worker Details ({users.filter(u => u.role === 'worker').length})</strong>
                </button>
              </div>

              {/* All Users Directory Table Card */}
              <div className="card">
                {/* User Filters & Search Bar */}
                <div className="flex gap-3" style={{ padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Search by name, email, department..." 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem' }}
                      value={userSearchTerm}
                      onChange={e => { setUserSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={16} color="var(--text-muted)" />
                    <select 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                      value={userRoleFilter}
                      onChange={e => { setUserRoleFilter(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="all">All Roles Filter</option>
                      <option value="staff">Staff Only</option>
                      <option value="worker">Worker Only</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <select 
                      className="form-control"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                      value={userStatusFilter}
                      onChange={e => { setUserStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>
                
                {/* Users Table (10 per page) */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Email / Username</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading KMCH users from MongoDB...</td></tr>
                      ) : currentUsers.length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No users match filter criteria.</td></tr>
                      ) : (
                        currentUsers.map(u => (
                          <tr key={u._id || u.email}>
                            <td><strong>{u.name}</strong></td>
                            <td><code>{u.email || u.username}</code></td>
                            <td>{u.phone || 'N/A'}</td>
                            <td>{u.department || 'General'}</td>
                            <td style={{ textTransform: 'capitalize' }}>
                              <span className={`badge ${u.role === 'admin' ? 'badge-info' : u.role === 'staff' ? 'badge-success' : 'badge-warning'}`}>
                                {u.role === 'staff' ? '👨‍⚕️ Staff' : u.role === 'worker' ? '🧹 Worker' : '🛡️ Admin'}
                              </span>
                            </td>
                            <td>
                              {u.isActive === false ? (
                                <span className="badge badge-danger">Inactive</span>
                              ) : (
                                <span className="badge badge-success">Active</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="flex gap-2 justify-end">
                                <button 
                                  className="btn"
                                  title="Alter User Details"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.82rem',
                                    backgroundColor: '#F8FAFC',
                                    color: 'var(--text-dark)',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleEditClick(u)}
                                >
                                  <Edit2 size={13} /> Alter Details
                                </button>
                                
                                {u.role !== 'admin' && (
                                  <>
                                    <button 
                                      className={`btn ${u.isActive === false ? 'btn-success' : 'btn-outline'}`}
                                      title={u.isActive === false ? "Activate Account" : "Deactivate Account"}
                                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                                      onClick={() => handleToggleActive(u)}
                                    >
                                      {u.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                                    </button>

                                    <button 
                                      className="btn btn-outline"
                                      title="Delete User"
                                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#E74C3C', borderColor: '#E74C3C' }}
                                      onClick={() => handleDeleteUser(u)}
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls (Exactly 10 per page) */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center" style={{ padding: '1rem', borderTop: '1px solid #E0E6ED' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Displaying {indexOfFirstUser + 1}–{Math.min(indexOfLastUser, users.length)} of {users.length} users
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.5rem' }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}



      {/* =========================================================
          VIEW 4: SETTINGS & ADMIN PROFILE (NAVS TO TOP FRESH PAGE)
         ========================================================= */}
      {activeTab === 'settings' && (
        <div>
          {/* Header */}
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ margin: 0 }}>Settings & Hospital Profile</h1>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>
                System administrator credentials, facility configs and alert preferences
              </p>
            </div>
            {settingsSaved && (
              <div className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Settings Saved Successfully! ✓
              </div>
            )}
          </div>

          <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
            
            {/* Admin Profile Card */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header">
                <h3 className="flex items-center gap-2"><ShieldCheck size={20} color="var(--primary-blue)" /> Admin Profile Details</h3>
              </div>

              <form onSubmit={handleSaveSettings}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label flex items-center gap-1">Administrator Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={adminProfile.name}
                      onChange={e => setAdminProfile({...adminProfile, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-1"><Mail size={14} /> Hospital Admin Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={adminProfile.email}
                      onChange={e => setAdminProfile({...adminProfile, email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-1"><Building size={14} /> Hospital Facility Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={adminProfile.hospitalName}
                      onChange={e => setAdminProfile({...adminProfile, hospitalName: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hospital License / Reg No.</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={adminProfile.hospitalId}
                      onChange={e => setAdminProfile({...adminProfile, hospitalId: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label flex items-center gap-1"><Phone size={14} /> Contact Phone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={adminProfile.phone}
                      onChange={e => setAdminProfile({...adminProfile, phone: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={adminProfile.department}
                      readOnly
                      style={{ backgroundColor: '#F4F7F9' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #E0E6ED', paddingTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary flex items-center gap-2">
                    <Save size={16} /> Save Profile Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Extra Features Sidebar Settings */}
            <div className="flex flex-col gap-4">
              
              {/* Alert & Notification Preferences */}
              <div className="card">
                <div className="card-header">
                  <h4 className="flex items-center gap-2" style={{ margin: 0 }}>
                    <Bell size={18} color="#F39C12" /> Notification Preferences
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Email alerts for pending backlog</span>
                    <input 
                      type="checkbox" 
                      checked={notifications.emailAlerts}
                      onChange={e => setNotifications({...notifications, emailAlerts: e.target.checked})}
                      style={{ width: '18px', height: '18px' }}
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Daily PDF Audit Summary report</span>
                    <input 
                      type="checkbox" 
                      checked={notifications.dailyReportSummary}
                      onChange={e => setNotifications({...notifications, dailyReportSummary: e.target.checked})}
                      style={{ width: '18px', height: '18px' }}
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Urgent Sharps waste alert</span>
                    <input 
                      type="checkbox" 
                      checked={notifications.urgentSharpsAlert}
                      onChange={e => setNotifications({...notifications, urgentSharpsAlert: e.target.checked})}
                      style={{ width: '18px', height: '18px' }}
                    />
                  </label>
                </div>
              </div>

              {/* System Security Box */}
              <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="card-header">
                  <h4 className="flex items-center gap-2" style={{ margin: 0 }}>
                    <Lock size={18} color="var(--primary-blue)" /> Security & Password
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Keep admin credentials secure. Password updates apply instantly to MongoDB.
                </p>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  onClick={() => alert('Security password change feature is active. Credentials stored with bcrypt hashing.')}
                >
                  Change Admin Password
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          ADD / EDIT USER MODAL (SHARED)
         ========================================================= */}
      {showAddUserModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card fade-in" style={{ width: '480px', position: 'relative' }}>
            <button 
              onClick={() => { setShowAddUserModal(false); setEditingUser(null); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="var(--text-muted)" />
            </button>
            <h3 style={{ marginBottom: '0.25rem' }}>
              {editingUser 
                ? `Alter ${editingUser.role === 'staff' ? '👨‍⚕️ Medical Staff' : editingUser.role === 'worker' ? '🧹 Sanitation Worker' : 'User'} Details`
                : `Add New ${newUser.role === 'staff' ? '👨‍⚕️ Medical Staff' : newUser.role === 'worker' ? '🧹 Sanitation Worker' : 'User'}`}
            </h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {editingUser ? `Altering profile parameters for ${editingUser.name} in KMCH database` : 'Create Staff or Worker accounts in KMCH MongoDB database'}
            </p>

            {formError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#27AE60', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  placeholder="e.g. Nurse Sarah"
                />
              </div>

              {!editingUser ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Email / Username</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      placeholder="e.g. nurse_sarah@hospital.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Initial Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      required
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Assign secure password"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label" style={{ color: '#2563EB', fontWeight: 600 }}>
                    🔒 Change / Reset Account Password
                  </label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Enter new password to reset, or leave blank to keep unchanged"
                    style={{ border: newUser.password ? '1.5px solid #2563EB' : '1px solid #CBD5E1' }}
                  />
                  <small style={{ color: '#64748B', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                    Admin Override: Entering a new password will instantly update this staff or worker's password in MongoDB.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newUser.phone}
                  onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Department / Ward</label>
                <select 
                  className="form-control" 
                  value={newUser.department}
                  onChange={e => setNewUser({...newUser, department: e.target.value})}
                >
                  <option value="">-- Select Hospital Department --</option>
                  <optgroup label="Medical Wards & Units">
                    <option value="Emergency">Emergency</option>
                    <option value="ICU">ICU (Intensive Care Unit)</option>
                    <option value="Pediatrics">Pediatrics Ward</option>
                    <option value="Surgery">Surgery OT</option>
                    <option value="General Ward">General Ward</option>
                    <option value="Oncology">Oncology Ward</option>
                    <option value="Cardiology">Cardiology Ward</option>
                    <option value="Radiology">Radiology Department</option>
                  </optgroup>
                  <optgroup label="Sanitation & Logistics Services">
                    <option value="Logistics">Logistics & Supply</option>
                    <option value="Sanitation">Sanitation Services</option>
                    <option value="Waste Mgt">BioWaste Management</option>
                    <option value="Environmental Care">Environmental Care</option>
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Job Role</label>
                <select 
                  className="form-control"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="staff">Medical Staff</option>
                  <option value="worker">Sanitation Worker</option>
                </select>
              </div>
              
              <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowAddUserModal(false); setEditingUser(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Saving Changes...' : editingUser ? 'Alter Details & Save' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
