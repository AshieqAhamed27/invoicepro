import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];
const projectStatuses = ['planning', 'active', 'review', 'completed', 'paused'];
const taskStatuses = ['todo', 'doing', 'done', 'blocked'];
const priorities = ['low', 'normal', 'high'];

const blankGroup = {
  name: '',
  focus: '',
  lead: '',
  status: 'planning'
};

const blankCollaborator = {
  name: '',
  email: '',
  role: '',
  skill: '',
  groupName: '',
  availability: 'medium',
  rate: ''
};

const blankTask = {
  title: '',
  owner: '',
  groupName: '',
  priority: 'normal',
  status: 'todo',
  dueDate: '',
  notes: ''
};

const formatCurrency = (amount, currency = 'INR') => {
  const prefix = currency === 'INR' ? 'Rs ' : `${currency} `;
  return `${prefix}${Number(amount || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
};

const formatDate = (date) => {
  if (!date) return 'No deadline';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const statusLabel = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildProjectSummary = (projects = []) => ({
  total: projects.length,
  active: projects.filter((project) => project.status === 'active').length,
  planning: projects.filter((project) => project.status === 'planning').length,
  review: projects.filter((project) => project.status === 'review').length,
  completed: projects.filter((project) => project.status === 'completed').length,
  groups: projects.reduce((sum, project) => sum + (project.groups?.length || 0), 0),
  collaborators: projects.reduce((sum, project) => sum + (project.collaborators?.length || 0), 0),
  openTasks: projects.reduce(
    (sum, project) => sum + (project.tasks || []).filter((task) => task.status !== 'done').length,
    0
  )
});

export default function TeamWorkspace() {
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({});
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planLoading, setPlanLoading] = useState('');
  const [form, setForm] = useState({
    title: '',
    clientName: '',
    budget: '',
    currency: 'INR',
    deadline: '',
    projectBrief: '',
    groups: [{ ...blankGroup }],
    collaborators: [{ ...blankCollaborator }],
    tasks: [{ ...blankTask }]
  });

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId) || projects[0] || null,
    [activeProjectId, projects]
  );

  const formGroupNames = useMemo(
    () => form.groups.map((group) => group.name.trim()).filter(Boolean),
    [form.groups]
  );

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team-projects');
      const nextProjects = res.data?.projects || [];
      setProjects(nextProjects);
      setSummary(res.data?.summary || {});
      if (!activeProjectId && nextProjects[0]?._id) {
        setActiveProjectId(nextProjects[0]._id);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to load team workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateGroup = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.map((group, currentIndex) =>
        currentIndex === index ? { ...group, [field]: value } : group
      )
    }));
  };

  const updateCollaborator = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      collaborators: prev.collaborators.map((person, currentIndex) =>
        currentIndex === index ? { ...person, [field]: value } : person
      )
    }));
  };

  const updateTask = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task, currentIndex) =>
        currentIndex === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const removeCollaborator = (index) => {
    setForm((prev) => ({
      ...prev,
      collaborators: prev.collaborators.length === 1
        ? [{ ...blankCollaborator }]
        : prev.collaborators.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const removeGroup = (index) => {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.length === 1
        ? [{ ...blankGroup }]
        : prev.groups.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const removeTask = (index) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.length === 1
        ? [{ ...blankTask }]
        : prev.tasks.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert('Add a project title first.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/team-projects', form);
      const created = res.data?.project;
      setForm({
        title: '',
        clientName: '',
        budget: '',
        currency: 'INR',
        deadline: '',
        projectBrief: '',
        groups: [{ ...blankGroup }],
        collaborators: [{ ...blankCollaborator }],
        tasks: [{ ...blankTask }]
      });
      await fetchProjects();
      if (created?._id) setActiveProjectId(created._id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create team project.');
    } finally {
      setSaving(false);
    }
  };

  const updateProjectStatus = async (project, status) => {
    try {
      const res = await api.patch(`/team-projects/${project._id}`, { status });
      setProjects((prev) => {
        const next = prev.map((item) => item._id === project._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update project.');
    }
  };

  const updateProjectTasks = async (project, nextTasks) => {
    try {
      const res = await api.patch(`/team-projects/${project._id}`, { tasks: nextTasks });
      setProjects((prev) => {
        const next = prev.map((item) => item._id === project._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update task.');
    }
  };

  const generateAiPlan = async (projectId) => {
    try {
      setPlanLoading(projectId);
      const res = await api.post(`/team-projects/${projectId}/ai-plan`);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === projectId ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'AI plan failed.');
    } finally {
      setPlanLoading('');
    }
  };

  const copyTeamBrief = async (project) => {
    const plan = project.aiPlan || {};
    const text = [
      `Project: ${project.title}`,
      `Client: ${project.clientName || 'Not set'}`,
      `Budget: ${formatCurrency(project.budget, project.currency)}`,
      `Deadline: ${formatDate(project.deadline)}`,
      '',
      `AI Summary: ${plan.summary || 'No AI plan yet'}`,
      `Next Action: ${plan.nextAction || 'Generate AI plan first'}`,
      '',
      'Groups:',
      ...(project.groups || []).map((group) => `- ${group.name}: ${group.focus || 'focus not set'}${group.lead ? ` | Lead: ${group.lead}` : ''}`),
      '',
      'Collaborators:',
      ...(project.collaborators || []).map((person) => `- ${person.name}: ${person.role || 'Contributor'} (${person.skill || 'skill not set'})${person.groupName ? ` | Group: ${person.groupName}` : ''}`),
      '',
      'Tasks:',
      ...(project.tasks || []).map((task) => `- ${task.title} | ${task.groupName || 'No group'} | ${task.owner || 'Unassigned'} | ${task.status}`)
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Team brief copied.');
    } catch {
      window.prompt('Copy team brief:', text);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-px w-8 bg-yellow-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Pro Team Workspace</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Work with other freelancers on bigger client projects
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                Add collaborators, assign roles, split tasks, track project risk, and let AI prepare the daily delivery plan before you invoice the client.
              </p>
            </div>

            <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.05] p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Why users pay</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                A solo freelancer can take bigger projects by bringing another freelancer into a structured delivery room.
              </p>
            </div>
          </div>
        </section>

        <section className="reveal reveal-delay-1 mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['Projects', summary.total || 0],
            ['Active', summary.active || 0],
            ['Groups', summary.groups || 0],
            ['Open tasks', summary.openTasks || 0],
            ['Collaborators', summary.collaborators || 0],
            ['In review', summary.review || 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-10">
          <section className="reveal reveal-delay-1 space-y-8">
            {loading ? (
              <div className="premium-panel p-8">
                <div className="h-6 w-48 animate-pulse rounded-full bg-white/5" />
                <div className="mt-5 h-32 animate-pulse rounded-3xl bg-white/5" />
              </div>
            ) : projects.length ? (
              <div className="grid gap-5">
                {projects.map((project) => {
                  const isActive = activeProject?._id === project._id;
                  const doneTasks = (project.tasks || []).filter((task) => task.status === 'done').length;
                  const totalTasks = project.tasks?.length || 0;

                  return (
                    <button
                      key={project._id}
                      type="button"
                      onClick={() => setActiveProjectId(project._id)}
                      className={`rounded-3xl border p-5 text-left transition-all hover:-translate-y-1 ${
                        isActive
                          ? 'border-yellow-300/40 bg-yellow-300/[0.06]'
                          : 'border-white/8 bg-white/[0.03] hover:border-white/15'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{project.clientName || 'Internal project'}</p>
                          <h2 className="mt-2 text-2xl font-black text-white">{project.title}</h2>
                          <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-zinc-500">
                            {project.projectBrief || 'No brief added yet.'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                            {statusLabel(project.status)}
                          </span>
                          <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                            {formatCurrency(project.budget, project.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Deadline</p>
                          <p className="mt-1 text-sm font-black text-white">{formatDate(project.deadline)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Groups</p>
                          <p className="mt-1 text-sm font-black text-white">{project.groups?.length || 0} groups</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Team</p>
                          <p className="mt-1 text-sm font-black text-white">{project.collaborators?.length || 0} people</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tasks</p>
                          <p className="mt-1 text-sm font-black text-white">{doneTasks}/{totalTasks} done</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="premium-panel p-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">No team project yet</p>
                <h2 className="mt-3 text-3xl font-black text-white">Create your first delivery room</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-zinc-500">
                  Use it when a project is too big for one freelancer and you need a designer, developer, writer, marketer, or assistant to help.
                </p>
              </div>
            )}

            {activeProject && (
              <div className="premium-panel p-5 sm:p-8">
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">AI delivery plan</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{activeProject.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                      {activeProject.aiPlan?.summary || 'Generate a plan to split work and reduce delivery risk.'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={activeProject.status}
                      onChange={(event) => updateProjectStatus(activeProject, event.target.value)}
                      className="input py-3 text-xs"
                    >
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => generateAiPlan(activeProject._id)}
                      disabled={planLoading === activeProject._id}
                      className="btn btn-primary px-5 py-3 text-xs"
                    >
                      {planLoading === activeProject._id ? 'Planning...' : 'Generate AI Plan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyTeamBrief(activeProject)}
                      className="btn btn-secondary px-5 py-3 text-xs"
                    >
                      Copy Brief
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <div className="rounded-3xl border border-white/8 bg-black/20 p-5 lg:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Next action</p>
                    <p className="mt-3 text-lg font-black leading-relaxed text-white">
                      {activeProject.aiPlan?.nextAction || 'Add collaborators and tasks, then generate the AI plan.'}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Risk level</p>
                    <p className={`mt-3 text-2xl font-black ${
                      activeProject.aiPlan?.riskLevel === 'high'
                        ? 'text-red-300'
                        : activeProject.aiPlan?.riskLevel === 'low'
                          ? 'text-emerald-300'
                          : 'text-yellow-300'
                    }`}>
                      {statusLabel(activeProject.aiPlan?.riskLevel || 'medium')}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-black text-white">Groups</h3>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(activeProject.aiPlan?.groupPlan?.length ? activeProject.aiPlan.groupPlan : activeProject.groups || []).map((group, index) => (
                      <div key={`${group.name}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{group.name}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
                              {group.focus || 'Project delivery'}
                            </p>
                          </div>
                          {group.risk && (
                            <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                              group.risk === 'high'
                                ? 'bg-red-400/10 text-red-300'
                                : group.risk === 'low'
                                  ? 'bg-emerald-400/10 text-emerald-300'
                                  : 'bg-yellow-400/10 text-yellow-300'
                            }`}>
                              {group.risk}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
                          {group.nextAction || `Lead: ${group.lead || 'Not assigned yet'}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-lg font-black text-white">Role split</h3>
                    <div className="space-y-3">
                      {(activeProject.aiPlan?.roleSplit?.length ? activeProject.aiPlan.roleSplit : activeProject.collaborators || []).map((person, index) => (
                        <div key={`${person.name}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-sm font-black text-white">{person.name}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-yellow-300">{person.role || 'Contributor'}</p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{person.focus || person.skill || 'No focus assigned yet.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-black text-white">Milestones</h3>
                    <div className="space-y-3">
                      {(activeProject.aiPlan?.milestonePlan || []).map((milestone, index) => (
                        <div key={`${milestone.title}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-sm font-black text-white">{milestone.title}</p>
                          <p className="mt-1 text-xs font-medium text-zinc-500">
                            {milestone.owner || 'Unassigned'} - {milestone.dueHint || 'Schedule next'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <h3 className="mb-4 text-lg font-black text-white">Project tasks</h3>
                    <div className="space-y-3">
                      {(activeProject.tasks || []).map((task, index) => (
                        <div key={task._id || index} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:grid-cols-[minmax(0,1fr)_150px]">
                          <div>
                            <p className="font-black text-white">{task.title}</p>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              {task.groupName || 'No group'} - {task.owner || 'Unassigned'} - {statusLabel(task.priority)} priority - {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <select
                            value={task.status}
                            onChange={(event) => {
                              const nextTasks = (activeProject.tasks || []).map((item, currentIndex) =>
                                currentIndex === index ? { ...item, status: event.target.value } : item
                              );
                              updateProjectTasks(activeProject, nextTasks);
                            }}
                            className="input py-3 text-xs"
                          >
                            {taskStatuses.map((status) => (
                              <option key={status} value={status}>{statusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-black text-white">AI risk notes</h3>
                    <div className="space-y-3">
                      {(activeProject.aiPlan?.risks || []).map((risk) => (
                        <div key={risk} className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.05] p-4 text-sm font-semibold leading-relaxed text-yellow-100">
                          {risk}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="reveal reveal-delay-2 xl:sticky xl:top-28 h-fit">
            <form onSubmit={handleSubmit} className="premium-panel p-5 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Create team project</p>
              <h2 className="mt-2 text-2xl font-black text-white">New collaboration room</h2>

              <div className="mt-6 space-y-4">
                <input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="Project title"
                  className="input py-4"
                />
                <input
                  value={form.clientName}
                  onChange={(event) => updateField('clientName', event.target.value)}
                  placeholder="Client name"
                  className="input py-4"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(event) => updateField('budget', event.target.value)}
                    placeholder="Budget"
                    className="input py-4"
                  />
                  <select
                    value={form.currency}
                    onChange={(event) => updateField('currency', event.target.value)}
                    className="input py-4"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(event) => updateField('deadline', event.target.value)}
                  className="input py-4"
                />
                <textarea
                  value={form.projectBrief}
                  onChange={(event) => updateField('projectBrief', event.target.value)}
                  placeholder="Brief: what should the team deliver?"
                  rows="4"
                  className="input min-h-[120px] resize-none py-4"
                />
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Groups</h3>
                  <button
                    type="button"
                    onClick={() => updateField('groups', [...form.groups, { ...blankGroup }])}
                    className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-4">
                  {form.groups.map((group, index) => (
                    <div key={index} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="grid gap-3">
                        <input
                          value={group.name}
                          onChange={(event) => updateGroup(index, 'name', event.target.value)}
                          placeholder="Group name, e.g. Design Team"
                          className="input py-3 text-sm"
                        />
                        <input
                          value={group.focus}
                          onChange={(event) => updateGroup(index, 'focus', event.target.value)}
                          placeholder="Group focus"
                          className="input py-3 text-sm"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={group.lead}
                            onChange={(event) => updateGroup(index, 'lead', event.target.value)}
                            placeholder="Group lead"
                            className="input py-3 text-sm"
                          />
                          <select
                            value={group.status}
                            onChange={(event) => updateGroup(index, 'status', event.target.value)}
                            className="input py-3 text-sm"
                          >
                            {projectStatuses.map((status) => (
                              <option key={status} value={status}>{statusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGroup(index)}
                          className="rounded-xl border border-red-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Collaborators</h3>
                  <button
                    type="button"
                    onClick={() => updateField('collaborators', [...form.collaborators, { ...blankCollaborator }])}
                    className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-4">
                  {form.collaborators.map((person, index) => (
                    <div key={index} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="grid gap-3">
                        <input
                          value={person.name}
                          onChange={(event) => updateCollaborator(index, 'name', event.target.value)}
                          placeholder="Freelancer name"
                          className="input py-3 text-sm"
                        />
                        <input
                          value={person.email}
                          onChange={(event) => updateCollaborator(index, 'email', event.target.value)}
                          placeholder="Email or contact"
                          className="input py-3 text-sm"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={person.role}
                            onChange={(event) => updateCollaborator(index, 'role', event.target.value)}
                            placeholder="Role"
                            className="input py-3 text-sm"
                          />
                          <input
                            value={person.skill}
                            onChange={(event) => updateCollaborator(index, 'skill', event.target.value)}
                            placeholder="Skill"
                            className="input py-3 text-sm"
                          />
                        </div>
                        <select
                          value={person.groupName}
                          onChange={(event) => updateCollaborator(index, 'groupName', event.target.value)}
                          className="input py-3 text-sm"
                        >
                          <option value="">No group selected</option>
                          {formGroupNames.map((groupName) => (
                            <option key={groupName} value={groupName}>{groupName}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(index)}
                          className="rounded-xl border border-red-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Tasks</h3>
                  <button
                    type="button"
                    onClick={() => updateField('tasks', [...form.tasks, { ...blankTask }])}
                    className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-4">
                  {form.tasks.map((task, index) => (
                    <div key={index} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="grid gap-3">
                        <input
                          value={task.title}
                          onChange={(event) => updateTask(index, 'title', event.target.value)}
                          placeholder="Task title"
                          className="input py-3 text-sm"
                        />
                        <input
                          value={task.owner}
                          onChange={(event) => updateTask(index, 'owner', event.target.value)}
                          placeholder="Owner name"
                          className="input py-3 text-sm"
                        />
                        <select
                          value={task.groupName}
                          onChange={(event) => updateTask(index, 'groupName', event.target.value)}
                          className="input py-3 text-sm"
                        >
                          <option value="">No group selected</option>
                          {formGroupNames.map((groupName) => (
                            <option key={groupName} value={groupName}>{groupName}</option>
                          ))}
                        </select>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            value={task.priority}
                            onChange={(event) => updateTask(index, 'priority', event.target.value)}
                            className="input py-3 text-sm"
                          >
                            {priorities.map((priority) => (
                              <option key={priority} value={priority}>{statusLabel(priority)}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(event) => updateTask(index, 'dueDate', event.target.value)}
                            className="input py-3 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="rounded-xl border border-red-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary mt-8 w-full py-5 text-base"
              >
                {saving ? 'Creating...' : 'Create Team Workspace'}
              </button>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
