import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trash2, Truck, AlertCircle, Calendar, Clock, Search, Building, ShieldCheck, TrendingUp, TrendingDown, Download, RefreshCw, CheckCircle2, Trash, Minus } from 'lucide-react';
import { api } from '../../services/api';
import { useT } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { getTodayISTDateString, formatISTDateTime, formatISTTime } from '../../utils/dateUtils';
import { BINS, BIN_COLORS, CATEGORIES, isActive, isDone, isCancelled, isCompliant, hasMismatch, statusBadgeClass, binClass, downloadCsv, formatMinutes } from '../../utils/waste';

const PAGE_SIZE = 15;
const EMPTY_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(name => ({ name, infectious: 0, sharps: 0, general: 0 }));

const ChartTooltip = ({ active, payload, label, title }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35)', border: '1px solid #334155', fontSize: '0.82rem', minWidth: '200px' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.45rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.35rem', color: '#94A3B8' }}>{title(label)}</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.3rem 0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#CBD5E1' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>{entry.name}:
          </span>
          <span style={{ fontWeight: 700 }}>{Number(entry.value).toFixed(1)} kg</span>
        </div>
      ))}
    </div>
  );
};

const TrendPill = ({ value, suffix = '%', neutralText }) => {
  if (value === null || value === undefined) {
    return <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}><Minus size={12} /> {neutralText}</span>;
  }
  const up = value > 0, flat = value === 0;
  const cls = flat ? 'badge-neutral' : up ? 'badge-success' : 'badge-danger';
  return <span className={`badge ${cls}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>{flat ? <Minus size={13} /> : up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {up ? '+' : ''}{value}{suffix}</span>;
};

const KpiCard = ({ icon, iconBg, pill, label, value, sub, bar, barColor }) => (
  <div className="card" style={{ padding: '1.25rem 1.35rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', gap: 8 }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      {pill}
    </div>
    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>{value}</div>
    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>{sub}</div>
    <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', marginTop: '0.85rem', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, bar))}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.4s ease' }}></div>
    </div>
  </div>
);

const AdminOverview = () => {
  const t = useT();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(getTodayISTDateString());
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async (signal) => {
    try {
      const [statsData, recordsData] = await Promise.all([api.getWasteStats(selectedDate, signal), api.getWasteRecordsByDate(selectedDate, signal)]);
      if (signal?.aborted) return;
      setStats(statsData);
      setRecords(recordsData);
    } catch (err) {
      if (err.name !== 'AbortError' && err.status !== 401) toast.error(err.message);
    }
  }, [selectedDate, toast]);

  // Fetch stats & records for selected date, aborting stale requests when the date changes quickly
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  useEffect(() => { setPage(1); }, [tab, search, categoryFilter, selectedDate]);

  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = async (r) => {
    if (!window.confirm(t('admin.confirmDeleteRecord', { id: r.recordId }))) return;
    try {
      await api.deleteWasteRecord(r._id);
      toast.success(t('admin.recordDeleted', { id: r.recordId }));
      await load();
    } catch (err) { toast.error(err.message); }
  };

  const q = search.trim().toLowerCase();
  const filtered = records.filter(r => {
    if (tab === 'pending' && !isActive(r)) return false;
    if (tab === 'completed' && !(isDone(r) || r.status === 'Collected')) return false;
    if (tab === 'cancelled' && !isCancelled(r)) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (q && ![r.recordId, r.room, r.category, r.createdBy, r.assignedTo].some(v => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExportCSV = () => {
    if (filtered.length === 0) { toast.info(t('admin.noExport')); return; }
    downloadCsv(
      `KMCH_BioWaste_Audit_${selectedDate}.csv`,
      ['Record ID', 'Room / Ward', 'Category', 'Weight (kg)', 'Assigned Bin', 'Status', 'Logged By', 'Assigned Worker', 'Collected By', 'Created (IST)', 'Collected At', 'Completed At', 'Compliant', 'Bin Verified', 'Mismatch Note', 'Cancel Reason'],
      filtered.map(r => [r.recordId, r.room, r.category, r.weight, r.assignedBin, r.status, r.createdBy, r.assignedTo || '', r.collectedBy || '', formatISTDateTime(r.createdAt), r.collectedAt ? formatISTDateTime(r.collectedAt) : '', r.completedAt ? formatISTDateTime(r.completedAt) : '', isCompliant(r.category, r.assignedBin) ? 'Yes' : 'No', isDone(r) ? (hasMismatch(r) ? 'No' : 'Yes') : '', r.binMismatchNote || '', r.cancelReason || ''])
    );
  };

  const s = stats || {};
  const chartData = s.weeklyChartData && s.weeklyChartData.length ? s.weeklyChartData : EMPTY_WEEK;
  const totalWeight = Number(s.totalWeight || 0);
  const binBreakdown = s.binBreakdown || {};
  const distribution = BINS.map(bin => ({
    bin, name: `${t(`bins.${bin}`)} — ${t(`binHints.${bin}`)}`, color: BIN_COLORS[bin], weight: Number(binBreakdown[bin] || 0),
    share: totalWeight > 0 ? Math.round((Number(binBreakdown[bin] || 0) / totalWeight) * 100) : 0
  }));
  const donutData = totalWeight > 0 ? distribution.filter(d => d.weight > 0).map(d => ({ name: d.name, value: d.weight, color: d.color })) : [{ name: t('admin.noRecordsDonut'), value: 1, color: '#E2E8F0' }];
  const clearancePct = s.todayTotalRecords > 0 ? Math.round((s.todayCompleted / s.todayTotalRecords) * 100) : 0;
  const turnaround = formatMinutes(s.avgTurnaroundMinutes);
  const counts = {
    all: records.length, pending: records.filter(isActive).length,
    completed: records.filter(r => isDone(r) || r.status === 'Collected').length, cancelled: records.filter(isCancelled).length
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>{t('admin.breadcrumbRoot')}</span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>{t('admin.breadcrumb')}</span>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>{t('admin.realtime')}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800 }}>{t('admin.title')}</h1>
          <p style={{ margin: '0.15rem 0 0 0', color: '#64748B', fontSize: '0.88rem' }}>{t('admin.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
            <Calendar size={15} color="#2563EB" />
            <input type="date" id="admin-date-picker" value={selectedDate} max={getTodayISTDateString()} onChange={(e) => setSelectedDate(e.target.value || getTodayISTDateString())} style={{ border: 'none', outline: 'none', fontSize: '0.84rem', fontWeight: 600, color: '#334155', fontFamily: 'inherit', backgroundColor: 'transparent', cursor: 'pointer' }} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedDate(getTodayISTDateString())}>{t('common.today')}</button>
          <button className="btn btn-outline btn-sm" onClick={handleRefresh} title={t('admin.sync')}><RefreshCw size={15} color="#2563EB" className={refreshing || loading ? 'spin' : ''} /> {t('admin.sync')}</button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCSV}><Download size={15} /> {t('admin.exportAudit')}</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard icon={<Trash2 size={20} color="#2563EB" />} iconBg="#EFF6FF" pill={<TrendPill value={s.weightChangePct} neutralText={t('admin.noPrevData')} />}
          label={t('admin.totalVolume')} value={loading ? '...' : `${totalWeight} kg`} sub={s.weightChangePct !== null && s.weightChangePct !== undefined ? t('admin.vsPrevDay') : t('admin.acrossWards')}
          bar={totalWeight > 0 ? Math.min(100, (totalWeight / 100) * 100) : 0} barColor="linear-gradient(90deg, #2563EB, #60A5FA)" />
        <KpiCard icon={<ShieldCheck size={20} color="#059669" />} iconBg="#ECFDF5" pill={<TrendPill value={s.complianceChangePct} suffix=" pts" neutralText={t('admin.noPrevData')} />}
          label={t('admin.segregationCompliance')} value={loading ? '...' : `${s.complianceRate ?? 100}%`} sub={t('admin.benchmark')}
          bar={s.complianceRate ?? 100} barColor={(s.complianceRate ?? 100) >= 90 ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)'} />
        <KpiCard icon={<Truck size={20} color="#7C3AED" />} iconBg="#F5F3FF" pill={<span className="badge badge-info" style={{ fontSize: '0.75rem', fontWeight: 700 }}><Clock size={13} /> {t('admin.pendingBadge', { n: s.todayPending || 0 })}</span>}
          label={t('admin.dayClearance')} value={loading ? '...' : `${s.todayCompleted || 0} / ${s.todayTotalRecords || 0}`} sub={turnaround ? t('admin.avgTurnaround', { t: turnaround }) : t('admin.noTurnaround')}
          bar={clearancePct} barColor="linear-gradient(90deg, #7C3AED, #A78BFA)" />
        <KpiCard icon={<AlertCircle size={20} color={s.previousDaysPending > 0 ? '#DC2626' : '#059669'} />} iconBg={s.previousDaysPending > 0 ? '#FEF2F2' : '#ECFDF5'}
          pill={<span className={`badge ${s.previousDaysPending > 0 ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>{s.previousDaysPending > 0 ? t('admin.attentionNeeded') : t('admin.optimalSafety')}</span>}
          label={t('admin.backlog')} value={loading ? '...' : t('admin.lots', { n: s.previousDaysPending || 0 })} sub={s.previousDaysPending > 0 ? t('admin.pendingSanitation') : t('admin.zeroBreaches')}
          bar={s.previousDaysPending > 0 ? Math.min(100, 20 + s.previousDaysPending * 8) : 100} barColor={s.previousDaysPending > 0 ? '#EF4444' : '#10B981'} />
      </div>

      {/* Charts */}
      <div className="two-col">
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{t('admin.trendsTitle')}</span>
              {s.weekRangeLabel && <span className="badge badge-info" style={{ fontSize: '0.75rem' }}><Calendar size={12} /> {t('admin.weekOf', { range: s.weekRangeLabel })}</span>}
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>{t('admin.trendsSub')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
            {[['#F59E0B', t('admin.legendInfectious')], ['#10B981', t('admin.legendGeneral')], ['#64748B', t('admin.legendSharps')]].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c }}></span><strong style={{ color: '#0F172A' }}>{l}</strong></span>
            ))}
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  {[['infectiousGrad', '#F59E0B'], ['generalGrad', '#10B981'], ['sharpsGrad', '#64748B']].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.35} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} unit="kg" />
                <Tooltip content={<ChartTooltip title={(l) => t('admin.generationAudit', { day: l })} />} />
                <Area type="monotone" dataKey="infectious" name={t('admin.legendInfectious')} stroke="#F59E0B" strokeWidth={2.5} fill="url(#infectiousGrad)" />
                <Area type="monotone" dataKey="general" name={t('admin.legendGeneral')} stroke="#10B981" strokeWidth={2.5} fill="url(#generalGrad)" />
                <Area type="monotone" dataKey="sharps" name={t('admin.legendSharps')} stroke="#64748B" strokeWidth={2} fill="url(#sharpsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('admin.hazardRatio')}</h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>{t('admin.shareByBin')}</p>
          </div>
          <div style={{ position: 'relative', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={55} outerRadius={75} paddingAngle={donutData.length > 1 ? 4 : 0} dataKey="value" isAnimationActive={false}>
                  {donutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                {totalWeight > 0 && <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} kg`]} />}
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{totalWeight} kg</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('admin.totalLogged')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {distribution.map(cat => (
              <div key={cat.bin} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 600 }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }}></span>{cat.name}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{cat.share}% <span style={{ color: '#64748B', fontWeight: 500, fontSize: '0.75rem' }}>({cat.weight.toFixed(1)} kg)</span></span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${cat.share}%`, height: '100%', backgroundColor: cat.color }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{t('admin.logStream')}</h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>{t('admin.logStreamSub')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '10px', flexWrap: 'wrap' }}>
            {[['all', t('admin.tabAll', { n: counts.all })], ['pending', t('admin.tabPending', { n: counts.pending })], ['completed', t('admin.tabCompleted', { n: counts.completed })], ['cancelled', t('admin.tabCancelled', { n: counts.cancelled })]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: tab === key ? '#FFFFFF' : 'transparent', color: tab === key ? '#2563EB' : '#64748B', boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" className="form-control" placeholder={t('admin.searchRecords')} value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.55rem 0.75rem 0.55rem 2.25rem', fontSize: '0.85rem' }} />
          </div>
          <select className="form-control" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 'auto', padding: '0.55rem 2rem 0.55rem 0.85rem', fontSize: '0.85rem' }}>
            <option value="all">{t('common.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('common.recordId')}</th><th>{t('common.time')}</th><th>{t('common.room')}</th><th>{t('common.category')}</th><th>{t('common.weight')}</th>
                <th>{t('common.assignedBin')}</th><th>{t('common.loggedBy')}</th><th>{t('common.worker')}</th><th>{t('common.status')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>{t('common.loading')}</td></tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748B' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={32} color="#10B981" />
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>{t('admin.noRecordsFor', { date: selectedDate })}</span>
                      <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{t('admin.allClear')}</span>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map(r => {
                const compliant = isCompliant(r.category, r.assignedBin);
                return (
                  <tr key={r._id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', backgroundColor: '#F1F5F9', padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.82rem' }}>{r.recordId}</span></td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>{formatISTTime(r.createdAt)}</td>
                    <td><span style={{ fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Building size={14} color="#64748B" />{r.room}</span></td>
                    <td>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{t(`categories.${r.category}`)}</span>
                      {!compliant && <div style={{ fontSize: '0.7rem', color: '#B45309', fontWeight: 600 }}>⚠ {t('staff.reviewRequired')}</div>}
                    </td>
                    <td><span style={{ fontWeight: 700 }}>{r.weight} kg</span></td>
                    <td><span className={binClass(r.assignedBin)}>{t(`bins.${r.assignedBin}`)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E0E7FF', color: '#3730A3', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{(r.createdBy || 'S').charAt(0).toUpperCase()}</div>
                        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>{r.createdBy}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>{r.collectedBy || r.assignedTo || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>{t('common.unassigned')}</span>}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(r.status)}`}>
                        {isDone(r) && <CheckCircle2 size={12} />}{r.status === 'Collected' && <Truck size={12} />}{isActive(r) && <Clock size={12} />}
                        {t(`statuses.${r.status}`)}
                      </span>
                      {hasMismatch(r) && <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600, marginTop: 2 }}>⚠ {t('admin.mismatch')}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }} title={t('admin.deleteRecord')} onClick={() => handleDelete(r)}><Trash size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1.5rem', fontSize: '0.82rem' }}>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}><Download size={14} /> {t('admin.downloadCsv')}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
