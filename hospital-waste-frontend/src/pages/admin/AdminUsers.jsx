import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Plus, X, Edit2, UserCheck, UserX, Trash, Search, Filter, Building, CheckCircle, Truck, ArrowLeft, Calendar, Stethoscope, Brush, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { useT } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;
const MEDICAL_DEPTS = ['Emergency', 'ICU', 'Pediatrics', 'Surgery', 'General Ward', 'Oncology', 'Cardiology', 'Radiology'];
const SANITATION_DEPTS = ['Logistics', 'Sanitation', 'Waste Mgt', 'Environmental Care'];
const EMPTY_FORM = { name: '', email: '', password: '', phone: '', role: 'staff', department: '' };

const AdminUsers = ({ loggedToday }) => {
  const t = useT();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const view = new URLSearchParams(location.search).get('view') || 'overview'; // overview | staff | worker

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setUsers(await api.getUsers());
    } catch (err) {
      if (err.status !== 401) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); window.scrollTo(0, 0); }, [view, roleFilter, statusFilter, search]);

  const q = search.trim().toLowerCase();
  const matches = (u) =>
    (!q || [u.name, u.email, u.username, u.department, u.phone].some(v => (v || '').toLowerCase().includes(q))) &&
    (statusFilter === 'all' || (statusFilter === 'active' ? u.isActive !== false : u.isActive === false));

  const staff = users.filter(u => u.role === 'staff');
  const workers = users.filter(u => u.role === 'worker');
  const listForView = view === 'staff' ? staff : view === 'worker' ? workers : users.filter(u => roleFilter === 'all' || u.role === roleFilter);
  const filtered = listForView.filter(matches);
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = (role, department = '') => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, role, department });
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ name: u.name || '', email: u.email || u.username || '', password: '', phone: u.phone || '', role: u.role || 'staff', department: u.department || '' });
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingUser(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || (!editingUser && (!form.email.trim() || !form.password)) || !form.phone.trim()) {
      setFormError(t('admin.users.requiredFields'));
      return;
    }
    if (form.password && form.password.length < 6) {
      setFormError(t('profile.passwordMin'));
      return;
    }
    try {
      setSubmitting(true);
      if (editingUser) {
        await api.updateUser(editingUser._id, { name: form.name.trim(), phone: form.phone.trim(), department: form.department, role: form.role, password: form.password || undefined });
        toast.success(t('admin.users.updated', { name: form.name.trim() }));
      } else {
        const res = await api.createUser({ name: form.name.trim(), email: form.email.trim(), username: form.email.trim(), password: form.password, phone: form.phone.trim(), role: form.role, department: form.department || (form.role === 'staff' ? 'General Ward' : 'Logistics') });
        toast.success(t('admin.users.created', { name: res.user.name }));
      }
      closeModal();
      await fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      const res = await api.toggleUserActive(u._id);
      toast.success(t('admin.users.statusUpdated', { name: u.name, status: res.isActive ? t('common.active').toLowerCase() : t('common.inactive').toLowerCase() }));
      await fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(t('admin.users.confirmDelete', { name: u.name }))) return;
    try {
      await api.deleteUser(u._id);
      toast.success(t('admin.users.userDeleted', { name: u.name }));
      await fetchUsers();
    } catch (err) { toast.error(err.message); }
  };

  const roleLabel = (role) => role === 'staff' ? t('roles.medicalStaff') : role === 'worker' ? t('roles.sanitationWorker') : t('roles.administrator');

  const renderActions = (u) => (
    <div className="flex gap-2 justify-end">
      <button className="btn btn-outline btn-sm" title={t('admin.users.alterDetails')} onClick={() => openEdit(u)}><Edit2 size={13} /> {t('common.edit')}</button>
      {u.role !== 'admin' && (
        <>
          <button className={`btn btn-sm ${u.isActive === false ? 'btn-success' : 'btn-outline'}`} title={u.isActive === false ? t('admin.users.activate') : t('admin.users.deactivate')} onClick={() => handleToggleActive(u)}>
            {u.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
          </button>
          <button className="btn btn-danger btn-sm" title={t('admin.users.deleteUser')} onClick={() => handleDelete(u)}><Trash size={14} /></button>
        </>
      )}
    </div>
  );

  const renderStatus = (u) => u.isActive === false ? <span className="badge badge-danger">{t('common.inactive')}</span> : <span className="badge badge-success">{t('common.active')}</span>;

  const renderSearchBar = (placeholder, showRole) => (
    <div className="flex gap-3" style={{ padding: '1rem', borderBottom: '1px solid #E0E6ED', backgroundColor: '#F8FAFC', flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
        <Search size={18} color="var(--text-muted)" />
        <input type="text" placeholder={placeholder} className="form-control" style={{ padding: '0.4rem 0.75rem' }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {showRole && (
        <div className="flex items-center gap-2">
          <Filter size={16} color="var(--text-muted)" />
          <select className="form-control" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">{t('admin.users.allRoles')}</option>
            <option value="staff">{t('admin.users.staffOnly')}</option>
            <option value="worker">{t('admin.users.workerOnly')}</option>
            <option value="admin">{t('admin.users.adminOnly')}</option>
          </select>
        </div>
      )}
      <select className="form-control" style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem', width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="all">{t('common.allStatus')}</option>
        <option value="active">{t('admin.users.activeOnly')}</option>
        <option value="inactive">{t('admin.users.inactiveOnly')}</option>
      </select>
    </div>
  );

  // ── Detail sub-view (staff or worker) ───────────────────────────────────
  if (view === 'staff' || view === 'worker') {
    const isStaff = view === 'staff';
    const accent = isStaff ? '#27AE60' : '#E67E22';
    const kpis = isStaff ? [
      { label: t('admin.users.totalStaff'), value: staff.length, Icon: Users, cls: 'stat-green', color: '#27AE60' },
      { label: t('admin.users.activeOnDuty'), value: staff.filter(u => u.isActive !== false).length, Icon: CheckCircle, cls: 'stat-green', color: '#2ECC71' },
      { label: t('admin.users.departments'), value: new Set(staff.map(u => u.department || 'General')).size, Icon: Building, cls: 'stat-blue', color: '#3498DB' },
      { label: t('admin.users.loggedToday'), value: t('admin.users.records', { n: loggedToday ?? 0 }), Icon: Calendar, cls: 'stat-purple', color: '#9B59B6' },
    ] : [
      { label: t('admin.users.totalWorkers'), value: workers.length, Icon: Truck, cls: 'stat-yellow', color: '#E67E22' },
      { label: t('admin.users.activeOnDuty'), value: workers.filter(u => u.isActive !== false).length, Icon: CheckCircle, cls: 'stat-green', color: '#2ECC71' },
      { label: t('admin.users.pickupZones'), value: new Set(workers.map(u => u.department || 'Logistics')).size, Icon: Building, cls: 'stat-blue', color: '#3498DB' },
      { label: t('admin.users.inactiveOnly'), value: workers.filter(u => u.isActive === false).length, Icon: UserX, cls: 'stat-red', color: '#E74C3C' },
    ];

    return (
      <div>
        <div className="page-header">
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/users')}><ArrowLeft size={16} /> {t('admin.users.backToOverview')}</button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.55rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isStaff ? <Stethoscope size={24} color={accent} /> : <Brush size={24} color={accent} />} {isStaff ? t('admin.users.staffTitle') : t('admin.users.workerTitle')}
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{isStaff ? t('admin.users.staffSub') : t('admin.users.workerSub')}</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ backgroundColor: accent, borderColor: accent }} onClick={() => openAdd(view, isStaff ? 'General Ward' : 'Sanitation')}>
            <Plus size={18} /> {isStaff ? t('admin.users.addStaff') : t('admin.users.addWorker')}
          </button>
        </div>

        <div className="kpi-grid" style={{ gap: '1rem' }}>
          {kpis.map(k => (
            <div key={k.label} className="card stat-card" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div className={`stat-icon ${k.cls}`}><k.Icon size={22} /></div>
              <div className="stat-details"><h4>{k.label}</h4><div className="value">{k.value}</div></div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {renderSearchBar(isStaff ? t('admin.users.searchStaff') : t('admin.users.searchWorkers'))}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{isStaff ? t('admin.users.staffMember') : t('roles.sanitationWorker')}</th>
                  <th>{t('admin.users.emailLogin')}</th>
                  <th>{t('admin.users.phoneNumber')}</th>
                  <th>{isStaff ? t('admin.users.departmentWard') : t('admin.users.assignedArea')}</th>
                  <th>{t('admin.users.accountStatus')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin.users.alterManage')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>{t('admin.users.loadingUsers')}</td></tr>
                ) : pageUsers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>{isStaff ? t('admin.users.noStaff') : t('admin.users.noWorkers')}</td></tr>
                ) : pageUsers.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isStaff ? '#DCFCE7' : '#FEF3C7', color: isStaff ? '#166534' : '#92400E', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>{(u.name || '?').charAt(0).toUpperCase()}</div>
                        <div><strong>{u.name}</strong><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isStaff ? t('admin.users.medicalPersonnel') : t('admin.users.sanitationStaff')}</div></div>
                      </div>
                    </td>
                    <td><code>{u.email || u.username}</code></td>
                    <td>{u.phone || '—'}</td>
                    <td><span className={`badge ${isStaff ? 'badge-info' : 'badge-warning'}`}>{u.department || '—'}</span></td>
                    <td>{renderStatus(u)}</td>
                    <td style={{ textAlign: 'right' }}>{renderActions(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage}
            label={({ from, to, total }) => t(isStaff ? 'admin.users.showingStaff' : 'admin.users.showingWorkers', { from, to, total })} />
        </div>
        {modalOpen && renderUserModal()}
      </div>
    );
  }

  // ── Overview ────────────────────────────────────────────────────────────
  function renderUserModal() {
    const role = editingUser ? editingUser.role : form.role;
    return (
      <div className="modal-overlay" onClick={() => !submitting && closeModal()}>
        <div className="card modal-card fade-in" onClick={e => e.stopPropagation()}>
          <button onClick={closeModal} aria-label={t('common.close')} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
          <h3 style={{ marginBottom: '0.25rem' }}>{editingUser ? t('admin.users.modalAlter', { role: roleLabel(role) }) : t('admin.users.modalAdd', { role: roleLabel(role) })}</h3>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{editingUser ? t('admin.users.modalAlterSub', { name: editingUser.name }) : t('admin.users.modalAddSub')}</p>

          {formError && <div role="alert" style={{ padding: '0.75rem', backgroundColor: 'rgba(231,76,60,0.1)', color: '#C0392B', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{formError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('admin.users.fullName')}</label>
              <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('admin.users.namePlaceholder')} maxLength={80} autoFocus />
            </div>

            {!editingUser ? (
              <>
                <div className="form-group">
                  <label className="form-label">{t('admin.users.emailUsername')}</label>
                  <input type="email" className="form-control" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('admin.users.emailPlaceholder')} autoComplete="off" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.users.initialPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} className="form-control" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('admin.users.passwordPlaceholder')} autoComplete="new-password" style={{ paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label" style={{ color: '#2563EB' }}>{t('admin.users.resetPassword')}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('admin.users.resetPlaceholder')} autoComplete="new-password" minLength={6} style={{ paddingRight: '2.5rem', border: form.password ? '1.5px solid #2563EB' : undefined }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <small style={{ color: '#64748B', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>{t('admin.users.resetHint')}</small>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('admin.users.phoneNumber')}</label>
              <input type="tel" className="form-control" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('admin.users.phonePlaceholder')} maxLength={20} />
            </div>

            {role !== 'admin' && (
              <>
                <div className="form-group">
                  <label className="form-label">{t('admin.users.assignDepartment')}</label>
                  <select className="form-control" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="">{t('admin.users.selectDepartment')}</option>
                    <optgroup label={t('admin.users.medicalWards')}>{MEDICAL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                    <optgroup label={t('admin.users.sanitationServices')}>{SANITATION_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.users.jobRole')}</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="staff">{t('roles.medicalStaff')}</option>
                    <option value="worker">{t('roles.sanitationWorker')}</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal} disabled={submitting}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>{submitting ? t('common.saving') : editingUser ? t('admin.users.alterSave') : t('admin.users.addUser')}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{t('common.hospital')} — {t('admin.users.title')}</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>{t('admin.users.subtitle', { n: users.length })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAdd('staff')}><Plus size={18} /> {t('admin.users.addNewUser')}</button>
      </div>

      {/* Two Prominent Action Cards */}
      <div className="grid grid-cols-2" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'staff', Icon: Stethoscope, color: '#27AE60', bg: '#DCFCE7', grad: '#F0FDF4', dark: '#14532D', mid: '#166534', title: t('admin.users.staffDetails'), sub: t('admin.users.staffCardSub'), body: t('admin.users.staffCardBody'), cta: t('admin.users.goInsideStaff'), count: staff.length, badge: 'badge-success' },
          { key: 'worker', Icon: Brush, color: '#E67E22', bg: '#FEF3C7', grad: '#FFFBEB', dark: '#78350F', mid: '#92400E', title: t('admin.users.workerDetails'), sub: t('admin.users.workerCardSub'), body: t('admin.users.workerCardBody'), cta: t('admin.users.goInsideWorker'), count: workers.length, badge: 'badge-warning' },
        ].map(c => (
          <div key={c.key} className="card" style={{ padding: '1.25rem 1.5rem', borderLeft: `5px solid ${c.color}`, background: `linear-gradient(135deg, #FFFFFF 0%, ${c.grad} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div className="flex justify-between items-start" style={{ gap: 8 }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><c.Icon size={22} color={c.color} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: c.dark, fontWeight: 700 }}>{c.title}</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: c.mid }}>{c.sub}</p>
                </div>
              </div>
              <span className={`badge ${c.badge}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}>{t('admin.users.members', { n: c.count })}</span>
            </div>
            <div style={{ fontSize: '0.86rem', color: '#374151', lineHeight: '1.45' }}>{c.body}</div>
            <button className="btn" style={{ backgroundColor: c.color, color: '#FFF', width: '100%', boxShadow: `0 2px 8px ${c.color}4D` }} onClick={() => navigate(`/admin/users?view=${c.key}`)}>{c.cta}</button>
          </div>
        ))}
      </div>

      {/* All Users Directory Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} color="var(--primary-blue)" /><h3 style={{ margin: 0, fontSize: '1rem' }}>{t('admin.users.allUsers', { n: filtered.length })}</h3>
        </div>
        {renderSearchBar(t('admin.users.searchUsers'), true)}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('admin.users.fullName')}</th><th>{t('admin.users.emailUsername')}</th><th>{t('common.phone')}</th><th>{t('common.department')}</th><th>{t('common.role')}</th><th>{t('common.status')}</th><th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>{t('admin.users.loadingUsers')}</td></tr>
              ) : pageUsers.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>{t('admin.users.noUsers')}</td></tr>
              ) : pageUsers.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td><code>{u.email || u.username}</code></td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.department || '—'}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-info' : u.role === 'staff' ? 'badge-success' : 'badge-warning'}`}>{roleLabel(u.role)}</span></td>
                  <td>{renderStatus(u)}</td>
                  <td style={{ textAlign: 'right' }}>{renderActions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} label={({ from, to, total }) => t('admin.users.displaying', { from, to, total })} />
      </div>

      {modalOpen && renderUserModal()}
    </div>
  );
};

export default AdminUsers;
