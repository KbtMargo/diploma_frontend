'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  Briefcase, MessageSquare, Calendar, AlertCircle,
  Star, Clock, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Notification } from '@/types';
import { ROUTES } from '@/lib/constants';
import { useI18n } from '@/contexts/I18nContext';
import { formatRelativeDate } from '@/lib/utils';
import { notificationsService } from '@/services/notifications.service';
import toast from 'react-hot-toast';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

const NOTIFICATION_ICONS: Record<string, any> = {
  JOB_ALERT: Briefcase, APPLICATION_STATUS: CheckCheck, NEW_APPLICATION: Star,
  INTERVIEW_SCHEDULED: Calendar, MESSAGE: MessageSquare, SYSTEM: AlertCircle,
  DEADLINE_REMINDER: Clock, PROFILE_VIEW: Bell,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  JOB_ALERT: 'indigo', APPLICATION_STATUS: 'green', NEW_APPLICATION: 'yellow',
  INTERVIEW_SCHEDULED: 'purple', MESSAGE: 'blue', SYSTEM: 'gray',
  DEADLINE_REMINDER: 'red', PROFILE_VIEW: 'pink',
};

function NotificationItem({ notification, t, onMarkRead, onDelete }: {
  notification: Notification;
  t: (k: string, v?: any) => string;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const title = useAutoTranslate(notification.title);
  const content = useAutoTranslate(notification.content);
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const color = NOTIFICATION_COLORS[notification.type] || 'gray';
  return (
    <div className={`bg-white rounded-2xl p-4 border transition-all ${!notification.isRead ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color === 'indigo' ? 'bg-indigo-100' : color === 'green' ? 'bg-green-100' : color === 'yellow' ? 'bg-yellow-100' : color === 'purple' ? 'bg-purple-100' : color === 'blue' ? 'bg-blue-100' : color === 'red' ? 'bg-red-100' : 'bg-gray-100'}`}>
          <Icon size={18} className={`${color === 'indigo' ? 'text-indigo-600' : color === 'green' ? 'text-green-600' : color === 'yellow' ? 'text-yellow-600' : color === 'purple' ? 'text-purple-600' : color === 'blue' ? 'text-blue-600' : color === 'red' ? 'text-red-600' : 'text-gray-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-medium text-sm ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{title || notification.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{content || notification.content}</p>
            </div>
            {!notification.isRead && <div className="w-2 h-2 bg-indigo-600 rounded-full shrink-0 mt-1.5" />}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{formatRelativeDate(notification.createdAt, t)}</span>
            <div className="flex gap-1">
              {!notification.isRead && (
                <button onClick={() => onMarkRead(notification.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title={t('notifications.markRead')}>
                  <Check size={14} />
                </button>
              )}
              <button onClick={() => onDelete(notification.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t('notifications.delete')}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { router.push(ROUTES.LOGIN); return; }
    fetchNotifications();
  }, [isAuthenticated, page, unreadOnly]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const [data, count] = await Promise.all([
        notificationsService.getNotifications(page, unreadOnly),
        notificationsService.getUnreadCount(),
      ]);
      setNotifications(data.data);
      setTotal(data.meta.total);
      setUnreadCount(count);
    } catch {
      toast.error(t('notifications.error.load'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { toast.error(t('notifications.error.action')); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t('notifications.allMarkedRead'));
    } catch { toast.error(t('notifications.error.action')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(x => x - 1);
      toast.success(t('notifications.deleted'));
    } catch { toast.error(t('notifications.error.action')); }
  };

  const handleDeleteAll = async () => {
    if (!confirm(t('notifications.confirmDeleteAll'))) return;
    try {
      await notificationsService.deleteAll();
      setNotifications([]);
      setTotal(0);
      setUnreadCount(0);
      toast.success(t('notifications.allDeleted'));
    } catch { toast.error(t('notifications.error.action')); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.allRead')}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <CheckCheck size={16} /> {t('notifications.markAllRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleDeleteAll} className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={16} /> {t('notifications.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => { setUnreadOnly(false); setPage(1); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!unreadOnly ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
          {t('notifications.all')} ({total})
        </button>
        <button onClick={() => { setUnreadOnly(true); setPage(1); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${unreadOnly ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
          {t('notifications.unread')} ({unreadCount})
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <BellOff size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">
            {unreadOnly ? t('notifications.empty.unread') : t('notifications.empty.all')}
          </h3>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              t={t}
              onMarkRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
            {t('jobs.pagination.prev')}
          </button>
          <span className="px-4 py-2 text-gray-600">{page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:border-indigo-300 transition-colors">
            {t('jobs.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
