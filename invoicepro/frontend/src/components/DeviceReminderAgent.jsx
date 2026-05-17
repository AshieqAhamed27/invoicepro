import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { getUser, hasProAccess, isLoggedIn } from '../utils/auth';

export const DEVICE_REMINDERS_KEY = 'clientflow_device_reminders_enabled';
export const PLAN_DEVICE_REMINDERS_KEY = 'clientflow_plan_device_reminders_enabled';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getDateKey = () => new Date().toISOString().slice(0, 10);

const getReminderKey = (userId, dateKey, reminderId) =>
  `clientflow_device_reminder_${userId || 'user'}_${dateKey}_${reminderId}`;

const getDaysUntil = (dateValue) => {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;

  target.setHours(23, 59, 59, 999);
  return Math.ceil((target.getTime() - Date.now()) / DAY_MS);
};

const isIncomplete = (status) => !['done', 'completed', 'paid', 'cancelled'].includes(String(status || '').toLowerCase());

const buildInvoiceReminder = (invoiceData = {}) => {
  const invoices = Array.isArray(invoiceData.invoices) ? invoiceData.invoices : [];
  const unpaid = invoices
    .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid')
    .map((invoice) => ({
      ...invoice,
      daysUntil: getDaysUntil(invoice.dueDate)
    }))
    .filter((invoice) => invoice.daysUntil === null || invoice.daysUntil <= 2)
    .sort((a, b) => {
      const aDays = a.daysUntil ?? 99;
      const bDays = b.daysUntil ?? 99;
      if (aDays !== bDays) return aDays - bDays;
      return Number(b.amount || 0) - Number(a.amount || 0);
    });

  if (!unpaid.length) return null;

  const top = unpaid[0];
  const overdueCount = unpaid.filter((invoice) => Number(invoice.daysUntil) < 0).length;
  const dueSoonCount = unpaid.length - overdueCount;

  return {
    id: 'invoice-payment',
    title: overdueCount ? 'Payment collection needed' : 'Invoice follow-up due',
    body: overdueCount
      ? `${overdueCount} invoice${overdueCount === 1 ? ' is' : 's are'} overdue. Start with ${top.clientName || top.invoiceNumber || 'the highest value invoice'}.`
      : `${dueSoonCount} invoice${dueSoonCount === 1 ? ' needs' : 's need'} follow-up in the next 2 days.`,
    path: '/dashboard#payment-collection-agent',
    priority: overdueCount ? 100 : 80
  };
};

const buildLeadReminders = (leadData = {}) => {
  const reminders = [];
  const followUpsDue = Array.isArray(leadData.followUpsDue) ? leadData.followUpsDue : [];
  const openProposals = Array.isArray(leadData.openProposals) ? leadData.openProposals : [];
  const acceptedProposals = Array.isArray(leadData.acceptedProposals) ? leadData.acceptedProposals : [];

  if (followUpsDue.length) {
    reminders.push({
      id: 'lead-follow-up',
      title: 'Lead follow-up due',
      body: `${followUpsDue.length} lead${followUpsDue.length === 1 ? ' needs' : 's need'} a follow-up today. Open Lead Pipeline and message the warmest one first.`,
      path: '/leads',
      priority: 75
    });
  }

  const proposalDueSoon = openProposals.filter((proposal) => {
    const daysUntil = getDaysUntil(proposal.validUntil);
    return daysUntil === null || daysUntil <= 2;
  });

  if (proposalDueSoon.length) {
    reminders.push({
      id: 'proposal-follow-up',
      title: 'Proposal follow-up needed',
      body: `${proposalDueSoon.length} proposal${proposalDueSoon.length === 1 ? ' is' : 's are'} waiting for client action. Follow up before it goes cold.`,
      path: '/leads',
      priority: 70
    });
  }

  if (acceptedProposals.length) {
    reminders.push({
      id: 'accepted-proposal',
      title: 'Accepted proposal needs invoice',
      body: `${acceptedProposals.length} accepted proposal${acceptedProposals.length === 1 ? ' is' : 's are'} ready to convert into invoice.`,
      path: '/leads',
      priority: 85
    });
  }

  return reminders;
};

const buildProjectReminder = (projectData = {}) => {
  const projects = Array.isArray(projectData.projects) ? projectData.projects : [];
  const dueTasks = projects.flatMap((project) =>
    (project.tasks || [])
      .filter((task) => isIncomplete(task.status))
      .map((task) => ({
        ...task,
        projectTitle: project.title,
        daysUntil: getDaysUntil(task.dueDate)
      }))
      .filter((task) => task.daysUntil !== null && task.daysUntil <= 0)
  );

  if (!dueTasks.length) return null;

  const top = dueTasks.sort((a, b) => (a.daysUntil ?? 99) - (b.daysUntil ?? 99))[0];

  return {
    id: 'project-task',
    title: 'Project task due',
    body: `${dueTasks.length} task${dueTasks.length === 1 ? ' is' : 's are'} due. Start with "${top.title}" in ${top.projectTitle || 'Client Workroom'}.`,
    path: '/client-workroom',
    priority: 65
  };
};

const showNotification = (reminder) => {
  const notification = new window.Notification(reminder.title, {
    body: reminder.body,
    icon: '/logo.svg',
    tag: `clientflow-${reminder.id}`,
    data: { path: reminder.path }
  });

  notification.onclick = () => {
    window.focus();
    if (reminder.path) {
      window.location.href = reminder.path;
    }
  };
};

export default function DeviceReminderAgent() {
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const user = useMemo(() => (isLoggedIn() ? getUser() : null), [location.pathname, tick]);
  const isPro = hasProAccess(user);
  const userId = user?.id || user?._id || user?.email;

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const runDeviceReminderCheck = async () => {
      if (!user || typeof window === 'undefined' || !('Notification' in window)) return;
      if (window.Notification.permission !== 'granted') return;
      if (localStorage.getItem(DEVICE_REMINDERS_KEY) !== '1') return;

      const [invoiceResult, leadResult, projectResult] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        isPro ? api.get('/leads/dashboard') : Promise.resolve({ data: {} }),
        api.get('/team-projects')
      ]);

      const reminders = [
        invoiceResult.status === 'fulfilled' ? buildInvoiceReminder(invoiceResult.value.data) : null,
        ...(leadResult.status === 'fulfilled' ? buildLeadReminders(leadResult.value.data) : []),
        projectResult.status === 'fulfilled' ? buildProjectReminder(projectResult.value.data) : null
      ]
        .filter(Boolean)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);

      if (!reminders.length) return;

      const dateKey = getDateKey();

      reminders.forEach((reminder) => {
        const key = getReminderKey(userId, dateKey, reminder.id);
        if (localStorage.getItem(key) === '1') return;

        try {
          showNotification(reminder);
          localStorage.setItem(key, '1');
        } catch {
          // If the browser blocks notifications, the in-app dashboard still shows the reminders.
        }
      });
    };

    runDeviceReminderCheck();
  }, [isPro, tick, user, userId]);

  return null;
}
