import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, AlertTriangle, ClipboardList, CheckCircle, Package, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useT } from '../i18n/LanguageContext';

const NotificationBell = ({ onSelectTask }) => {
  const t = useT();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      if (err.status !== 401) console.warn('Failed to load notifications:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (e, notif) => {
    e.stopPropagation();
    if (notif.isRead) return;
    try {
      await api.markNotificationRead(notif._id);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif._id);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    setIsOpen(false);
    if (onSelectTask) {
      onSelectTask(notif);
    }
  };

  const formatElapsed = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('common.justNow');
    if (mins < 60) return t('common.minutesAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('common.hoursAgo', { n: hours });
    return t('common.daysAgo', { n: Math.floor(hours / 24) });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <AlertTriangle size={16} color="#DC2626" />;
      case 'assignment':
        return <ClipboardList size={16} color="#2563EB" />;
      case 'collection':
        return <Package size={16} color="#059669" />;
      case 'disposal':
        return <CheckCircle size={16} color="#16A34A" />;
      case 'status_update':
        return <XCircle size={16} color="#64748B" />;
      default:
        return <Bell size={16} color="#64748B" />;
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        id="notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title={t('notifications.tooltip')}
        style={{
          position: 'relative',
          background: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          color: '#334155',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
      >
        <Bell size={18} color={unreadCount > 0 ? '#DC2626' : '#64748B'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '0.72rem',
            fontWeight: 800,
            borderRadius: '12px',
            minWidth: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '380px',
          maxHeight: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{t('notifications.title')}</span>
              {unreadCount > 0 && (
                <span style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {t('notifications.newCount', { n: unreadCount })}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94A3B8' }}>
                <Bell size={32} color="#CBD5E1" style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('notifications.none')}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleItemClick(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F8FAFC',
                    backgroundColor: notif.isRead ? '#FFFFFF' : '#F0F9FF',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    position: 'relative',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = notif.isRead ? '#F8FAFC' : '#E0F2FE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.isRead ? '#FFFFFF' : '#F0F9FF'}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: notif.type === 'reminder' ? '#FEE2E2' : notif.type === 'assignment' ? '#DBEAFE' : notif.type === 'status_update' ? '#F1F5F9' : '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {getNotifIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: notif.isRead ? 600 : 700, color: '#0F172A' }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        {formatElapsed(notif.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.78rem',
                      color: '#475569',
                      margin: '3px 0 6px 0',
                      lineHeight: 1.35
                    }}>
                      {notif.message}
                    </p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {notif.recordId && (
                        <span style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          fontSize: '0.72rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {notif.recordId}
                        </span>
                      )}
                      {notif.room && (
                        <span style={{
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '0.72rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          {notif.room}
                        </span>
                      )}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, notif)}
                      title={t('notifications.markRead')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
