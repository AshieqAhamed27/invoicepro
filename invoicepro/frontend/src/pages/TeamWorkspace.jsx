import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser, hasProAccess } from '../utils/auth';
import { openWhatsAppShare } from '../utils/whatsapp';
import useDocumentMeta from '../utils/useDocumentMeta';

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];
const projectStatuses = ['planning', 'active', 'review', 'completed', 'paused'];
const taskStatuses = ['todo', 'doing', 'done', 'blocked'];

const defaultCreateForm = {
  title: '',
  clientName: '',
  budget: '',
  currency: 'INR',
  deadline: '',
  projectBrief: '',
  firstMilestone: 'Confirm scope and acceptance criteria',
  secondMilestone: 'Finish first delivery version',
  finalMilestone: 'Final handover and invoice',
  referenceLink: '',
  deliveryProof: 'Final files, screenshots, links, approval notes, and payment confirmation.'
};

const defaultTaskForm = {
  title: '',
  owner: '',
  priority: 'normal',
  status: 'todo',
  dueDate: '',
  notes: ''
};

const defaultResourceForm = {
  label: '',
  type: 'document',
  url: '',
  notes: ''
};

const defaultInviteForm = {
  email: '',
  role: 'viewer',
  groupName: ''
};

const defaultNoteForm = {
  title: '',
  category: 'delivery',
  content: ''
};

const formatCurrency = (amount, currency = 'INR') => {
  const prefix = currency === 'INR' ? 'Rs ' : `${currency} `;
  return `${prefix}${Number(amount || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
};

const formatDate = (value) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No deadline';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const statusLabel = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusClass = (status) => {
  if (status === 'completed' || status === 'done') {
    return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200';
  }
  if (status === 'review' || status === 'doing') {
    return 'border-sky-300/20 bg-sky-300/[0.08] text-sky-200';
  }
  if (status === 'blocked' || status === 'paused') {
    return 'border-red-300/20 bg-red-300/[0.08] text-red-200';
  }
  return 'border-yellow-300/20 bg-yellow-300/[0.08] text-yellow-200';
};

const buildSummary = (projects = []) => ({
  total: projects.length,
  active: projects.filter((project) => project.status === 'active').length,
  review: projects.filter((project) => project.status === 'review').length,
  openTasks: projects.reduce(
    (sum, project) => sum + (project.tasks || []).filter((task) => task.status !== 'done').length,
    0
  ),
  proofLinks: projects.reduce((sum, project) => sum + (project.resources || []).length, 0)
});

const getWorkroomHealth = (project) => {
  if (!project) {
    return {
      score: 0,
      label: 'No workroom',
      nextAction: 'Create the first client workroom.'
    };
  }

  const tasks = project.tasks || [];
  const resources = project.resources || [];
  const docs = project.wikiPages || [];
  const members = project.members || [];
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const blockedTasks = tasks.filter((task) => task.status === 'blocked');
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const hasScope = Boolean(project.projectBrief);
  const hasDeadline = Boolean(project.deadline);
  const hasProof = Boolean(resources.length || docs.length);
  const completion = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  let score = 35;
  if (hasScope) score += 15;
  if (hasDeadline) score += 10;
  if (tasks.length) score += 15;
  if (hasProof) score += 10;
  if (members.length > 1) score += 5;
  score += Math.min(completion, 10);
  score -= blockedTasks.length * 8;
  score = Math.max(5, Math.min(100, score));

  const nextTask = blockedTasks[0] || openTasks.find((task) => task.priority === 'high') || openTasks[0];
  const nextAction = project.aiPlan?.nextAction ||
    (nextTask
      ? `${nextTask.owner || 'Assign an owner'} should move "${nextTask.title}" forward.`
      : hasProof
        ? 'Create or share the final invoice and collect payment.'
        : 'Add proof links, handover notes, or final files before invoicing.');

  return {
    score,
    label: score >= 80 ? 'Healthy' : score >= 55 ? 'Needs attention' : 'At risk',
    nextAction
  };
};

const buildCreatePayload = (form) => {
  const tasks = [
    form.firstMilestone,
    form.secondMilestone,
    form.finalMilestone
  ]
    .map((title) => String(title || '').trim())
    .filter(Boolean)
    .map((title, index) => ({
      title,
      owner: index === 0 ? 'Owner' : '',
      groupName: 'Delivery',
      priority: index === 0 ? 'high' : 'normal',
      status: 'todo',
      dueDate: index === 2 ? form.deadline : '',
      notes: ''
    }));

  const resources = String(form.referenceLink || '').trim()
    ? [{
        label: 'Client reference link',
        type: 'document',
        url: form.referenceLink.trim(),
        notes: 'Added while creating the workroom.'
      }]
    : [];

  const wikiPages = [
    {
      title: 'Scope agreement',
      category: 'client',
      content: form.projectBrief || 'Add the agreed scope, deliverables, price, timeline, and acceptance criteria.'
    },
    {
      title: 'Delivery proof checklist',
      category: 'handover',
      content: form.deliveryProof
    }
  ].filter((page) => page.content);

  return {
    title: form.title,
    clientName: form.clientName,
    budget: form.budget,
    currency: form.currency,
    deadline: form.deadline,
    projectBrief: form.projectBrief,
    groups: [{
      name: 'Delivery',
      focus: 'Finish agreed client work and prepare proof for payment.',
      lead: 'Owner',
      status: 'planning'
    }],
    collaborators: [],
    tasks,
    resources,
    wikiPages
  };
};

export default function TeamWorkspace() {
  const navigate = useNavigate();
  const currentUser = getUser() || {};
  const isPro = hasProAccess(currentUser);

  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({});
  const [activeProjectId, setActiveProjectId] = useState('');
  const [canCreateProjects, setCanCreateProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [resourceForm, setResourceForm] = useState(defaultResourceForm);
  const [noteForm, setNoteForm] = useState(defaultNoteForm);
  const [inviteForm, setInviteForm] = useState(defaultInviteForm);
  const [lastInvite, setLastInvite] = useState(null);
  const [chatMessage, setChatMessage] = useState('');

  useDocumentMeta({
    title: 'Client Workroom | ClientFlow AI',
    description: 'Manage client scope, milestones, files, collaborators, delivery proof, invoice, and payment follow-up in one freelancer workroom.'
  });

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId) || projects[0] || null,
    [activeProjectId, projects]
  );

  const computedSummary = useMemo(
    () => ({ ...buildSummary(projects), ...summary }),
    [projects, summary]
  );

  const health = useMemo(() => getWorkroomHealth(activeProject), [activeProject]);
  const tasks = activeProject?.tasks || [];
  const resources = activeProject?.resources || [];
  const docs = activeProject?.wikiPages || [];
  const members = activeProject?.members || [];
  const messages = (activeProject?.messages || []).slice(-8);
  const canEdit = Boolean(activeProject?.canEdit || ['owner', 'editor'].includes(activeProject?.accessRole));
  const canInvite = Boolean(activeProject?.canInvite);

  const replaceProject = (updatedProject) => {
    if (!updatedProject?._id) return;

    setProjects((prev) => {
      const exists = prev.some((project) => project._id === updatedProject._id);
      const next = exists
        ? prev.map((project) => project._id === updatedProject._id ? updatedProject : project)
        : [updatedProject, ...prev];
      setSummary(buildSummary(next));
      return next;
    });
    setActiveProjectId(updatedProject._id);
  };

  const loadProjects = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.get('/team-projects');
      const nextProjects = res.data?.projects || [];
      setProjects(nextProjects);
      setSummary(res.data?.summary || buildSummary(nextProjects));
      setCanCreateProjects(Boolean(res.data?.canCreateProjects));

      if (!activeProjectId && nextProjects[0]?._id) {
        setActiveProjectId(nextProjects[0]._id);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not load client workrooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    setLastInvite(null);
    setChatMessage('');
    setTaskForm(defaultTaskForm);
    setResourceForm(defaultResourceForm);
    setNoteForm(defaultNoteForm);
    setInviteForm(defaultInviteForm);
  }, [activeProject?._id]);

  const createWorkroom = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canCreateProjects) {
      navigate('/payment');
      return;
    }

    if (!createForm.title.trim() || !createForm.clientName.trim()) {
      setError('Add project name and client name first.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/team-projects', buildCreatePayload(createForm));
      replaceProject(res.data?.project);
      setCreateForm(defaultCreateForm);
      setCreateOpen(false);
      setMessage('Client workroom created.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not create workroom.');
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (updates, loadingKey = 'project') => {
    if (!activeProject?._id || !canEdit) {
      setError('Only owners and editors can update this workroom.');
      return;
    }

    try {
      setActionLoading(loadingKey);
      const res = await api.patch(`/team-projects/${activeProject._id}`, updates);
      replaceProject(res.data?.project);
      setMessage('Workroom updated.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not update workroom.');
    } finally {
      setActionLoading('');
    }
  };

  const addTask = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!taskForm.title.trim()) {
      setError('Add a milestone or task title first.');
      return;
    }

    const nextTasks = [
      ...tasks,
      {
        ...taskForm,
        title: taskForm.title.trim(),
        owner: taskForm.owner.trim(),
        groupName: 'Delivery',
        notes: taskForm.notes.trim()
      }
    ];

    await updateProject({ tasks: nextTasks }, 'task');
    setTaskForm(defaultTaskForm);
  };

  const updateTaskStatus = async (taskId, status) => {
    const nextTasks = tasks.map((task) =>
      task._id === taskId ? { ...task, status } : task
    );
    await updateProject({ tasks: nextTasks }, `task-${taskId}`);
  };

  const addResource = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!resourceForm.label.trim() || !resourceForm.url.trim()) {
      setError('Add a label and https:// link first.');
      return;
    }

    try {
      setActionLoading('resource');
      const res = await api.post(`/team-projects/${activeProject._id}/resources`, {
        ...resourceForm,
        label: resourceForm.label.trim(),
        url: resourceForm.url.trim(),
        notes: resourceForm.notes.trim()
      });
      replaceProject(res.data?.project);
      setResourceForm(defaultResourceForm);
      setMessage('Proof link added.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not add proof link.');
    } finally {
      setActionLoading('');
    }
  };

  const addDeliveryNote = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      setError('Add note title and content first.');
      return;
    }

    try {
      setActionLoading('note');
      const res = await api.post(`/team-projects/${activeProject._id}/wiki-pages`, {
        ...noteForm,
        title: noteForm.title.trim(),
        content: noteForm.content.trim()
      });
      replaceProject(res.data?.project);
      setNoteForm(defaultNoteForm);
      setMessage('Delivery note saved.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not save delivery note.');
    } finally {
      setActionLoading('');
    }
  };

  const createInvite = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!canInvite) {
      setError('Only the paid project owner can create invite links.');
      return;
    }

    try {
      setActionLoading('invite');
      const res = await api.post(`/team-projects/${activeProject._id}/invites`, inviteForm);
      replaceProject(res.data?.project);
      setLastInvite(res.data?.invite || null);
      setMessage('Invite link created.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not create invite.');
    } finally {
      setActionLoading('');
    }
  };

  const copyInvite = async () => {
    if (!lastInvite?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(lastInvite.inviteUrl);
      setMessage('Invite link copied.');
    } catch {
      window.prompt('Copy invite link:', lastInvite.inviteUrl);
    }
  };

  const shareInvite = () => {
    if (lastInvite?.whatsappText) {
      openWhatsAppShare(lastInvite.whatsappText);
    }
  };

  const sendProjectMessage = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!chatMessage.trim()) return;

    try {
      setActionLoading('message');
      const res = await api.post(`/team-projects/${activeProject._id}/messages`, {
        senderName: currentUser.name || currentUser.email || 'Team member',
        message: chatMessage.trim()
      });
      replaceProject(res.data?.project);
      setChatMessage('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not send update.');
    } finally {
      setActionLoading('');
    }
  };

  const generateWorkroomPlan = async () => {
    setError('');
    setMessage('');

    try {
      setActionLoading('plan');
      const res = await api.post(`/team-projects/${activeProject._id}/ai-plan`);
      replaceProject(res.data?.project);
      setMessage('Workroom plan refreshed.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not refresh plan.');
    } finally {
      setActionLoading('');
    }
  };

  const copyClientSummary = async () => {
    if (!activeProject) return;

    const text = [
      `Project: ${activeProject.title}`,
      `Client: ${activeProject.clientName || 'Not added'}`,
      `Budget: ${formatCurrency(activeProject.budget, activeProject.currency)}`,
      `Deadline: ${formatDate(activeProject.deadline)}`,
      '',
      `Scope: ${activeProject.projectBrief || 'Scope not added yet.'}`,
      '',
      'Milestones:',
      ...(tasks.length ? tasks.map((task) => `- ${task.title}: ${statusLabel(task.status)}`) : ['- Add milestones first.']),
      '',
      `Next action: ${health.nextAction}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setMessage('Client summary copied.');
    } catch {
      window.prompt('Copy project summary:', text);
    }
  };

  const sharePaymentFollowUp = () => {
    if (!activeProject) return;

    openWhatsAppShare([
      `Hi ${activeProject.clientName || ''},`,
      `Sharing a quick update for ${activeProject.title}.`,
      'The agreed work is ready/moving as planned. Please confirm the next payment step when convenient.',
      `Amount: ${formatCurrency(activeProject.budget, activeProject.currency)}`,
      'Thank you.'
    ].join('\n'));
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-14">
        <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Client Workroom
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Run each client project from scope to payment.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
              One place for scope, milestones, collaborator invites, project updates, delivery proof, invoices, and payment follow-up. This is the practical system freelancers need after they win a client.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Workroom health</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-black text-white">{health.score}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-500">{health.label}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(activeProject?.status || 'planning')}`}>
                {statusLabel(activeProject?.status || 'planning')}
              </span>
            </div>
            <p className="mt-4 rounded-2xl border border-white/8 bg-black/25 p-4 text-sm font-semibold leading-relaxed text-zinc-300">
              {health.nextAction}
            </p>
          </div>
        </section>

        {(message || error) && (
          <section className={`mb-6 rounded-2xl border p-4 ${
            error
              ? 'border-red-300/20 bg-red-300/[0.08] text-red-100'
              : 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100'
          }`}>
            <p className="text-sm font-bold">{error || message}</p>
          </section>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Workrooms', computedSummary.total || projects.length],
            ['Active', computedSummary.active || 0],
            ['Open tasks', computedSummary.openTasks || 0],
            ['Proof links', computedSummary.proofLinks || 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
              <p className="mt-3 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-5">
          {[
            ['1', 'Agree scope', 'Clear deliverables, price, timeline.'],
            ['2', 'Manage work', 'Milestones and owners stay visible.'],
            ['3', 'Save proof', 'Files, links, notes, approvals.'],
            ['4', 'Create invoice', 'Turn delivered work into payment.'],
            ['5', 'Collect payment', 'Follow up before cash gets stuck.']
          ].map(([step, title, text]) => (
            <div key={step} className="rounded-[1.25rem] border border-white/8 bg-black/25 p-4 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">{step}</span>
              <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{text}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-5 xl:sticky xl:top-28">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Projects</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Client list</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen((open) => !open)}
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  New
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="h-3 w-2/3 rounded-full bg-white/10" />
                    <div className="mt-3 h-3 w-1/2 rounded-full bg-white/5" />
                  </div>
                ) : projects.length ? (
                  projects.map((project) => (
                    <button
                      key={project._id}
                      type="button"
                      onClick={() => setActiveProjectId(project._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                        activeProject?._id === project._id
                          ? 'border-emerald-300/30 bg-emerald-300/[0.08]'
                          : 'border-white/8 bg-black/20 hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <p className="text-sm font-black text-white">{project.title}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">{project.clientName || 'Client not added'}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusClass(project.status)}`}>
                          {statusLabel(project.status)}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {(project.tasks || []).filter((task) => task.status !== 'done').length} open
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-sm font-black text-white">No client workroom yet.</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
                      Create one when a client shows interest or accepts a proposal.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(createOpen || !projects.length) && (
              <form onSubmit={createWorkroom} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Create workroom</p>
                <h2 className="mt-3 text-2xl font-black text-white">New client project</h2>
                {!canCreateProjects && (
                  <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4">
                    <p className="text-sm font-semibold leading-relaxed text-yellow-100">
                      Creating client workrooms is a Pro feature because it stores projects, collaborators, notes, and delivery proof.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/payment')}
                      className="mt-4 rounded-xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950"
                    >
                      Upgrade
                    </button>
                  </div>
                )}
                <div className="mt-5 grid gap-4">
                  <input className="input" value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Project name" />
                  <input className="input" value={createForm.clientName} onChange={(event) => setCreateForm({ ...createForm, clientName: event.target.value })} placeholder="Client name" />
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <input className="input" type="number" min="0" value={createForm.budget} onChange={(event) => setCreateForm({ ...createForm, budget: event.target.value })} placeholder="Project value" />
                    <select className="input" value={createForm.currency} onChange={(event) => setCreateForm({ ...createForm, currency: event.target.value })}>
                      {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </div>
                  <input className="input" type="date" value={createForm.deadline} onChange={(event) => setCreateForm({ ...createForm, deadline: event.target.value })} />
                  <textarea className="input min-h-[110px]" value={createForm.projectBrief} onChange={(event) => setCreateForm({ ...createForm, projectBrief: event.target.value })} placeholder="Scope: what client expects, deliverables, price, timeline, acceptance criteria" />
                  <input className="input" value={createForm.firstMilestone} onChange={(event) => setCreateForm({ ...createForm, firstMilestone: event.target.value })} placeholder="First milestone" />
                  <input className="input" value={createForm.secondMilestone} onChange={(event) => setCreateForm({ ...createForm, secondMilestone: event.target.value })} placeholder="Second milestone" />
                  <input className="input" value={createForm.finalMilestone} onChange={(event) => setCreateForm({ ...createForm, finalMilestone: event.target.value })} placeholder="Final milestone" />
                  <input className="input" value={createForm.referenceLink} onChange={(event) => setCreateForm({ ...createForm, referenceLink: event.target.value })} placeholder="Optional client reference link https://" />
                  <button type="submit" disabled={saving} className="btn btn-primary w-full">
                    {saving ? 'Creating...' : 'Create Client Workroom'}
                  </button>
                </div>
              </form>
            )}
          </aside>

          <section className="min-w-0">
            {!activeProject ? (
              <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 text-center">
                <h2 className="text-3xl font-black text-white">Create your first client workroom</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                  Use it when a lead becomes serious. Keep the scope, work, proof, invoice, and payment follow-up together.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-7">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)] lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusClass(activeProject.status)}`}>
                          {statusLabel(activeProject.status)}
                        </span>
                        <span className="rounded-full border border-white/8 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {activeProject.accessRole || 'owner'}
                        </span>
                      </div>
                      <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                        {activeProject.title}
                      </h2>
                      <p className="mt-3 text-base font-semibold text-zinc-400">
                        Client: <span className="text-white">{activeProject.clientName || 'Not added'}</span>
                      </p>
                      <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400">
                        {activeProject.projectBrief || 'Add scope so the client, freelancer, and collaborators know exactly what is included before payment is requested.'}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Commercials</p>
                      <p className="mt-3 text-3xl font-black text-white">{formatCurrency(activeProject.budget, activeProject.currency)}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">Deadline: {formatDate(activeProject.deadline)}</p>
                      <select
                        className="input mt-5"
                        value={activeProject.status || 'planning'}
                        disabled={!canEdit || actionLoading === 'status'}
                        onChange={(event) => updateProject({ status: event.target.value }, 'status')}
                      >
                        {projectStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <button type="button" onClick={generateWorkroomPlan} disabled={actionLoading === 'plan'} className="btn btn-secondary">
                      {actionLoading === 'plan' ? 'Refreshing...' : 'Refresh Plan'}
                    </button>
                    <button type="button" onClick={copyClientSummary} className="btn btn-secondary">
                      Copy Client Summary
                    </button>
                    <button type="button" onClick={() => navigate('/create-invoice')} className="btn btn-primary">
                      Create Invoice
                    </button>
                    <button type="button" onClick={sharePaymentFollowUp} className="btn btn-dark">
                      WhatsApp Follow-up
                    </button>
                  </div>
                </section>

                <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)] 2xl:items-start">
                  <div className="space-y-6">
                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Milestones</p>
                          <h3 className="mt-2 text-2xl font-black text-white">Work that must finish</h3>
                        </div>
                        <span className="rounded-full border border-white/8 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {tasks.filter((task) => task.status === 'done').length}/{tasks.length || 0} done
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {tasks.length ? tasks.map((task) => (
                          <div key={task._id || task.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                              <div>
                                <p className="text-base font-black text-white">{task.title}</p>
                                <p className="mt-1 text-sm font-semibold text-zinc-500">
                                  {task.owner || 'Unassigned'} - {formatDate(task.dueDate)}
                                </p>
                                {task.notes && <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{task.notes}</p>}
                              </div>
                              <select
                                className="input"
                                value={task.status || 'todo'}
                                disabled={!canEdit || actionLoading === `task-${task._id}`}
                                onChange={(event) => updateTaskStatus(task._id, event.target.value)}
                              >
                                {taskStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                              </select>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-sm font-semibold text-zinc-500">No milestones yet. Add the first delivery task below.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={addTask} className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <input className="input" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Add milestone or task" />
                        <div className="grid gap-3 md:grid-cols-3">
                          <input className="input" value={taskForm.owner} onChange={(event) => setTaskForm({ ...taskForm, owner: event.target.value })} placeholder="Owner" />
                          <select className="input" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                            <option value="low">Low priority</option>
                            <option value="normal">Normal priority</option>
                            <option value="high">High priority</option>
                          </select>
                          <input className="input" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} />
                        </div>
                        <textarea className="input min-h-[88px]" value={taskForm.notes} onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })} placeholder="Notes or acceptance criteria" />
                        <button type="submit" disabled={!canEdit || actionLoading === 'task'} className="btn btn-secondary w-full">
                          {actionLoading === 'task' ? 'Adding...' : 'Add Milestone'}
                        </button>
                      </form>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Proof and files</p>
                          <h3 className="mt-2 text-2xl font-black text-white">Links the client can trust</h3>
                        </div>
                        <Link to="/cloud-documents" className="btn btn-dark">
                          Open Cloud Docs
                        </Link>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {resources.length ? resources.map((resource) => (
                          <a
                            key={resource._id || resource.url}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-sky-300/25"
                          >
                            <p className="text-sm font-black text-white">{resource.label}</p>
                            <p className="mt-1 text-xs font-black uppercase tracking-widest text-sky-300">{statusLabel(resource.type || 'document')}</p>
                            {resource.notes && <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{resource.notes}</p>}
                          </a>
                        )) : (
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 md:col-span-2">
                            <p className="text-sm font-semibold text-zinc-500">Add proposal, design, drive, preview, contract, or delivery proof links here.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={addResource} className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                          <input className="input" value={resourceForm.label} onChange={(event) => setResourceForm({ ...resourceForm, label: event.target.value })} placeholder="Link label" />
                          <select className="input" value={resourceForm.type} onChange={(event) => setResourceForm({ ...resourceForm, type: event.target.value })}>
                            <option value="document">Document</option>
                            <option value="design">Design</option>
                            <option value="preview">Preview</option>
                            <option value="repository">Repository</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <input className="input" value={resourceForm.url} onChange={(event) => setResourceForm({ ...resourceForm, url: event.target.value })} placeholder="https://..." />
                        <textarea className="input min-h-[80px]" value={resourceForm.notes} onChange={(event) => setResourceForm({ ...resourceForm, notes: event.target.value })} placeholder="Why this link matters" />
                        <button type="submit" disabled={!canEdit || actionLoading === 'resource'} className="btn btn-secondary w-full">
                          {actionLoading === 'resource' ? 'Saving...' : 'Add Proof Link'}
                        </button>
                      </form>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Delivery notes</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Scope, approvals, handover</h3>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {docs.length ? docs.map((doc) => (
                          <article key={doc._id || doc.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-sm font-black text-white">{doc.title}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">{statusLabel(doc.category || 'note')}</p>
                            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-500">{doc.content}</p>
                          </article>
                        )) : (
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4 md:col-span-2">
                            <p className="text-sm font-semibold text-zinc-500">Save important agreements, revision notes, client approval, and final handover details.</p>
                          </div>
                        )}
                      </div>

                      <form onSubmit={addDeliveryNote} className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <input className="input" value={noteForm.title} onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                        <select className="input" value={noteForm.category} onChange={(event) => setNoteForm({ ...noteForm, category: event.target.value })}>
                          <option value="client">Client agreement</option>
                          <option value="delivery">Delivery</option>
                          <option value="qa">Review / QA</option>
                          <option value="handover">Handover</option>
                          <option value="other">Other</option>
                        </select>
                        <textarea className="input min-h-[110px]" value={noteForm.content} onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })} placeholder="Write the decision, proof, approval, or handover note" />
                        <button type="submit" disabled={!canEdit || actionLoading === 'note'} className="btn btn-secondary w-full">
                          {actionLoading === 'note' ? 'Saving...' : 'Save Note'}
                        </button>
                      </form>
                    </div>
                  </div>

                  <aside className="space-y-6">
                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Payment path</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Get paid without confusion</h3>
                      <div className="mt-5 space-y-3">
                        {[
                          ['Scope agreed', activeProject.projectBrief ? 'Ready' : 'Missing scope'],
                          ['Work status', `${tasks.filter((task) => task.status === 'done').length}/${tasks.length || 0} tasks done`],
                          ['Proof saved', resources.length || docs.length ? 'Ready' : 'Add proof'],
                          ['Invoice', 'Create when delivery is ready']
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                            <p className="mt-1 text-sm font-black text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-3">
                        <button type="button" onClick={() => navigate('/create-invoice')} className="btn btn-primary w-full">
                          Create Invoice
                        </button>
                        <button type="button" onClick={sharePaymentFollowUp} className="btn btn-secondary w-full">
                          Prepare WhatsApp Follow-up
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">Collaborators</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Bring another freelancer</h3>
                      <div className="mt-5 space-y-3">
                        {members.map((member) => (
                          <div key={member._id || member.email || member.name} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-sm font-black text-white">{member.name || member.email || 'Team member'}</p>
                            <p className="mt-1 text-xs font-semibold text-zinc-500">{member.email || 'No email'} - {member.role}</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={createInvite} className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <input className="input" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} placeholder="Freelancer email optional" />
                        <select className="input" value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value })}>
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button type="submit" disabled={!canInvite || actionLoading === 'invite'} className="btn btn-secondary w-full">
                          {actionLoading === 'invite' ? 'Creating...' : 'Create Invite Link'}
                        </button>
                      </form>
                      {lastInvite?.inviteUrl && (
                        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
                          <p className="text-sm font-semibold leading-relaxed text-emerald-100">Invite ready for {lastInvite.role} access.</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={copyInvite} className="btn btn-dark">Copy</button>
                            <button type="button" onClick={shareInvite} className="btn btn-dark">WhatsApp</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Project updates</p>
                      <h3 className="mt-2 text-2xl font-black text-white">Simple team chat</h3>
                      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
                        {messages.length ? messages.map((item) => (
                          <div key={item._id || `${item.senderName}-${item.createdAt}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-300">{item.senderName || 'Team member'}</p>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{item.message}</p>
                            <p className="mt-2 text-[10px] font-semibold text-zinc-600">{formatDate(item.createdAt)}</p>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <p className="text-sm font-semibold text-zinc-500">No updates yet. Write what changed, what is blocked, or what the client approved.</p>
                          </div>
                        )}
                      </div>
                      <form onSubmit={sendProjectMessage} className="mt-5 grid gap-3">
                        <textarea className="input min-h-[90px]" value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} placeholder="Write project update" />
                        <button type="submit" disabled={actionLoading === 'message'} className="btn btn-secondary w-full">
                          {actionLoading === 'message' ? 'Sending...' : 'Send Update'}
                        </button>
                      </form>
                    </div>
                  </aside>
                </section>
              </div>
            )}
          </section>
        </section>

        {!isPro && (
          <section className="mt-8 rounded-[1.75rem] border border-yellow-300/20 bg-yellow-300/[0.08] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">Pro workflow</p>
                <h2 className="mt-2 text-2xl font-black text-white">Workrooms become valuable when you use them for real client delivery.</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-yellow-100/80">
                  Upgrade when you want saved client projects, collaborator invites, delivery proof, and payment workflow in one place.
                </p>
              </div>
              <button type="button" onClick={() => navigate('/payment')} className="btn btn-primary shrink-0">
                Upgrade Pro
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
