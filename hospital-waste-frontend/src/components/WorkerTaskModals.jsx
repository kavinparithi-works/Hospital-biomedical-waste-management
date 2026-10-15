import React, { useState } from 'react';
import { X, Shield, Package, CheckCircle, AlertTriangle, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useT } from '../i18n/LanguageContext';
import { formatISTDateTime } from '../utils/dateUtils';
import { BIN_COLORS, binClass, isActive, isDone, statusBadgeClass } from '../utils/waste';

// Pending/Assigned → Collected → Completed flow indicator
const StatusFlow = ({ status }) => {
  const t = useT();
  const steps = [
    { label: t('statuses.Pending'), active: isActive({ status }), color: '#F59E0B', done: status === 'Collected' || isDone({ status }) },
    { label: t('statuses.Collected'), active: status === 'Collected', color: '#2563EB', done: isDone({ status }) },
    { label: t('statuses.Disposed'), active: isDone({ status }), color: '#10B981', done: false },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ArrowRight size={16} color="#CBD5E1" />}
          <div style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: step.active ? step.color : (step.done ? step.color + '20' : '#E2E8F0'), color: step.active ? '#fff' : (step.done ? step.color : '#94A3B8'), border: step.done ? `1px solid ${step.color}50` : 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {step.done && <Check size={12} />}{step.label}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export const TaskDetailsModal = ({ task, onClose, onCollect, onDispose, busy }) => {
  const t = useT();
  if (!task) return null;
  const tc = (c) => t(`categories.${c}`);
  const field = (label, value) => (
    <div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
      <div style={{ fontWeight: 600, marginTop: '0.2rem', fontSize: '0.9rem' }}>{value}</div>
    </div>
  );
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card fade-in" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label={t('common.close')} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
        <h3 style={{ marginBottom: '0.25rem' }}>{t('worker.taskDetails', { id: task.recordId })}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{t('worker.createdBy', { name: task.createdBy || t('roles.medicalStaff') })}</p>

        <StatusFlow status={task.status} />

        <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.25rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
          {field(t('worker.roomLabel'), <span style={{ color: 'var(--primary-blue)' }}>{task.room}</span>)}
          {field(t('worker.wasteCategory'), tc(task.category))}
          {field(t('common.weight'), `${task.weight} ${t('common.kg')}`)}
          {field(t('common.assignedBin'), <span className={binClass(task.assignedBin)}>{t(`bins.${task.assignedBin}`)}</span>)}
          {field(t('worker.requestedAt'), formatISTDateTime(task.assignedTime || task.createdAt))}
          {field(t('common.status'), <span className={`badge ${statusBadgeClass(task.status)}`}>{t(`statuses.${task.status}`)}</span>)}
          {task.collectedBy && field(t('common.collectedBy'), task.collectedBy)}
          {task.collectedAt && field(t('common.collectedAt'), formatISTDateTime(task.collectedAt))}
          {task.completedAt && field(t('common.completedAt'), formatISTDateTime(task.completedAt))}
        </div>

        {task.description && (
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{t('common.description')}</span>
            <p style={{ fontSize: '0.9rem', backgroundColor: '#FFF', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', margin: '0.3rem 0 0 0', color: '#334155' }}>{task.description}</p>
          </div>
        )}
        {task.binMismatchNote && (
          <div style={{ marginBottom: '1.25rem', padding: '0.6rem 0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: '0.85rem', color: '#B91C1C', display: 'flex', gap: 6 }}>
            <AlertTriangle size={15} /> {task.binMismatchNote}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>{t('common.close')}</button>
          {isActive(task) && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onCollect(task)} disabled={busy}>
              <Package size={15} /> {busy ? t('worker.updating') : t('worker.collectWaste')}
            </button>
          )}
          {task.status === 'Collected' && (
            <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#059669', borderColor: '#059669' }} onClick={() => onDispose(task)} disabled={busy}>
              <ShieldCheck size={15} /> {t('worker.proceedDispose')}
            </button>
          )}
          {isDone(task) && (
            <button className="btn btn-success" style={{ flex: 1 }} disabled>{t('worker.completedDone')}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export const BinVerifyModal = ({ record, onClose, onConfirm, busy }) => {
  const t = useT();
  const [binMatch, setBinMatch] = useState(true);
  const [note, setNote] = useState('');
  if (!record) return null;
  const bin = record.assignedBin;
  const canConfirm = binMatch || note.trim().length > 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !busy && onClose()}>
      <div className="card modal-card fade-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label={t('common.close')} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={22} color="#059669" /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{t('worker.binVerification')}</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{record.recordId} — {record.room}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: BIN_COLORS[bin] || '#CBD5E1', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('worker.assignedBinColour')}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: BIN_COLORS[bin] || '#334155' }}>{t(`bins.${bin}`)} {t('bins.bin')}</div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>{t(`categories.${record.category}`)} • {record.weight} {t('common.kg')}</div>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.75rem' }}>{t('worker.binVerifyQuestion', { bin: t(`bins.${bin}`) })}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          {[
            { value: true, title: t('worker.binVerifyYes'), sub: t('worker.binVerifyYesSub'), color: '#059669', border: '#10B981', bg: '#ECFDF5', Icon: CheckCircle },
            { value: false, title: t('worker.binVerifyNo'), sub: t('worker.binVerifyNoSub'), color: '#DC2626', border: '#EF4444', bg: '#FEF2F2', Icon: AlertTriangle },
          ].map(opt => (
            <label key={String(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', borderRadius: '8px', border: binMatch === opt.value ? `2px solid ${opt.border}` : '1px solid var(--border-color)', backgroundColor: binMatch === opt.value ? opt.bg : '#FFFFFF', cursor: 'pointer' }}>
              <input type="radio" name="binMatch" checked={binMatch === opt.value} onChange={() => setBinMatch(opt.value)} />
              <opt.Icon size={16} color={opt.color} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: opt.color }}>{opt.title}</strong>
                <span style={{ fontSize: '0.75rem', color: opt.color }}>{opt.sub}</span>
              </div>
            </label>
          ))}
        </div>

        {!binMatch && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#DC2626', display: 'block', marginBottom: '0.3rem' }}>{t('worker.binMismatchLabel')}</label>
            <textarea className="form-control" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={t('worker.binMismatchPlaceholder')} maxLength={300} style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }} autoFocus />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button id="btn-confirm-disposal" className="btn btn-primary" style={{ flex: 1.2, backgroundColor: '#10B981', borderColor: '#10B981' }} onClick={() => onConfirm(binMatch, binMatch ? '' : note.trim())} disabled={busy || !canConfirm}>
            <Check size={16} /> {busy ? t('worker.updating') : t('worker.confirmComplete')}
          </button>
        </div>
      </div>
    </div>
  );
};
