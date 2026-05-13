import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatDate, getPlanLabel, getUser, hasProAccess, isLoggedIn } from '../utils/auth';

const DEVICE_REMINDER_KEY = 'clientflow_plan_device_reminders_enabled';
const PLAN_EXPIRY_REMINDER_DAYS = 2;
const dismissedKey = (userId, dateKey) => `clientflow_plan_reminder_dismissed_${userId || 'user'}_${dateKey}`;
const notifiedKey = (userId, dateKey) => `clientflow_plan_device_notified_${userId || 'user'}_${dateKey}`;

const getDateKey = () => new Date().toISOString().slice(0, 10);

const getExpiryState = (user) => {
  if (!user?.planExpiresAt) {
    return {
      expiresAt: null,
      daysLeft: null,
      expired: false,
      expiringSoon: false
    };
  }

  const expiresAt = new Date(user.planExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      expiresAt: null,
      daysLeft: null,
      expired: false,
      expiringSoon: false
    };
  }

  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    expiresAt,
    daysLeft,
    expired: daysLeft <= 0,
    expiringSoon: daysLeft > 0 && daysLeft <= PLAN_EXPIRY_REMINDER_DAYS
  };
};

const getReminderCopy = (user, expiryState) => {
  const planLabel = getPlanLabel(user);

  if (expiryState.expired) {
    return {
      title: `${planLabel} expired`,
      body: 'Renew Pro to keep AI client finding, proposals, team workspace, and unlimited invoices active.',
      tone: 'danger'
    };
  }

  return {
    title: `${planLabel} expires in ${expiryState.daysLeft} day${expiryState.daysLeft === 1 ? '' : 's'}`,
    body: `Renew before ${formatDate(expiryState.expiresAt)} so your Pro workflow does not stop.`,
    tone: 'warning'
  };
};

export default function PlanReminderAgent() {
  const location = useLocation();
  const [user, setUser] = useState(() => (isLoggedIn() ? getUser() : null));
  const [isDismissed, setIsDismissed] = useState(false);
  const [notificationState, setNotificationState] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  ));

  useEffect(() => {
    const refreshUser = () => {
      setUser(isLoggedIn() ? getUser() : null);
    };

    refreshUser();
    const interval = window.setInterval(refreshUser, 60 * 1000);
    window.addEventListener('storage', refreshUser);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refreshUser);
    };
  }, [location.pathname]);

  const expiryState = useMemo(() => getExpiryState(user), [user]);
  const hasPlanWithExpiry = Boolean(user?.plan && user.plan !== 'free' && expiryState.expiresAt);
  const shouldRemind = Boolean(user && hasPlanWithExpiry && (expiryState.expiringSoon || expiryState.expired));
  const todayKey = getDateKey();
  const reminder = useMemo(() => getReminderCopy(user, expiryState), [user, expiryState]);
  const userId = user?.id || user?._id || user?.email;

  useEffect(() => {
    if (!shouldRemind) {
      setIsDismissed(false);
      return;
    }

    setIsDismissed(localStorage.getItem(dismissedKey(userId, todayKey)) === '1');
  }, [shouldRemind, todayKey, userId]);

  useEffect(() => {
    if (!shouldRemind) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission !== 'granted') return;

    const deviceEnabled = localStorage.getItem(DEVICE_REMINDER_KEY) === '1';
    if (!deviceEnabled) return;

    const key = notifiedKey(userId, todayKey);
    if (localStorage.getItem(key) === '1') return;

    try {
      new window.Notification('ClientFlow AI Plan Reminder', {
        body: `${reminder.title}. ${reminder.body}`,
        icon: '/logo.svg',
        tag: 'clientflow-plan-reminder'
      });
      localStorage.setItem(key, '1');
    } catch {
      // Browser blocked notification creation. The in-app reminder still shows.
    }
  }, [reminder, shouldRemind, todayKey, userId]);

  const enableDeviceReminders = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationState('unsupported');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationState(permission);

    if (permission === 'granted') {
      localStorage.setItem(DEVICE_REMINDER_KEY, '1');
      try {
        new window.Notification('ClientFlow AI reminders enabled', {
          body: 'You will get plan expiry reminders on this device when ClientFlow AI is open.',
          icon: '/logo.svg',
          tag: 'clientflow-plan-reminder-enabled'
        });
      } catch {}
    }
  };

  const dismissToday = () => {
    localStorage.setItem(dismissedKey(userId, todayKey), '1');
    setIsDismissed(true);
  };

  if (!shouldRemind || isDismissed) return null;

  const toneClass = reminder.tone === 'danger'
    ? 'border-red-300/25 bg-red-300/[0.1] text-red-100'
    : reminder.tone === 'warning'
      ? 'border-yellow-300/25 bg-yellow-300/[0.1] text-yellow-100'
      : 'border-sky-300/25 bg-sky-300/[0.1] text-sky-100';

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 print:hidden sm:left-5 sm:right-auto sm:max-w-md">
      <div className={`rounded-3xl border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl ${toneClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">AI plan reminder agent</p>
            <h3 className="mt-1 text-base font-black text-white">{reminder.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed opacity-85">{reminder.body}</p>
          </div>
          <button
            type="button"
            onClick={dismissToday}
            className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:bg-black/30"
          >
            Hide
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            to="/payment"
            className="rounded-2xl bg-white px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-zinc-100"
          >
            Renew Pro
          </Link>
          {notificationState === 'default' ? (
            <button
              type="button"
              onClick={enableDeviceReminders}
              className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/[0.12]"
            >
              Enable Device Alert
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissToday}
              className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/[0.12]"
            >
              Remind Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
