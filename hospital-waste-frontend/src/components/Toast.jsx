import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

const STYLES = {
  success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', Icon: CheckCircle },
  error: { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', Icon: AlertTriangle },
  info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', Icon: Info }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value = useMemo(() => ({
    toast,
    success: (m, d) => toast(m, 'success', d),
    error: (m, d) => toast(m, 'error', d ?? 6000),
    info: (m, d) => toast(m, 'info', d)
  }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const s = STYLES[type] || STYLES.info;
          return (
            <div key={id} className="toast fade-in" style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}>
              <s.Icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{message}</span>
              <button onClick={() => dismiss(id)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 2 }}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
