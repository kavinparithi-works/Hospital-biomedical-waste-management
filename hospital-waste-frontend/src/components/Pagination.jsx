import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../i18n/LanguageContext';

// Client-side pagination controls. Renders nothing when everything fits on one page.
const Pagination = ({ page, pageSize, total, onChange, label }) => {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const current = Math.min(page, totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination">
      <span className="pagination-label">{label ? label({ from, to, total }) : t('common.showing', { from, to, total })}</span>
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" disabled={current <= 1} onClick={() => onChange(current - 1)}>
          <ChevronLeft size={15} /> {t('common.prev')}
        </button>
        {pages.map((p, i) => p === '…'
          ? <span key={`dot-${i}`} style={{ padding: '0 0.3rem', color: '#94A3B8' }}>…</span>
          : <button key={p} className={`btn btn-sm ${current === p ? 'btn-primary' : 'btn-outline'}`} style={{ minWidth: 36 }} onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="btn btn-outline btn-sm" disabled={current >= totalPages} onClick={() => onChange(current + 1)}>
          {t('common.next')} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
