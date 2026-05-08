import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getToken, getUser } from '../utils/auth';
import { openWhatsAppShare } from '../utils/whatsapp';

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];
const projectStatuses = ['planning', 'active', 'review', 'completed', 'paused'];
const taskStatuses = ['todo', 'doing', 'done', 'blocked'];
const priorities = ['low', 'normal', 'high'];
const codeOsOptions = ['linux', 'windows', 'macos', 'android', 'ios', 'server', 'other'];
const runnableLanguages = ['javascript', 'python', 'shell'];

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

const formatMessageTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
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
  messages: projects.reduce((sum, project) => sum + (project.messages?.length || 0), 0),
  openTasks: projects.reduce(
    (sum, project) => sum + (project.tasks || []).filter((task) => task.status !== 'done').length,
    0
  )
});

export default function TeamWorkspace() {
  const currentUser = getUser() || {};
  const chatOpenRef = useRef(false);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({});
  const [canCreateProjects, setCanCreateProjects] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planLoading, setPlanLoading] = useState('');
  const [chatGroup, setChatGroup] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatLiveStatus, setChatLiveStatus] = useState('offline');
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resourceSaving, setResourceSaving] = useState(false);
  const [environmentSaving, setEnvironmentSaving] = useState(false);
  const [snippetSaving, setSnippetSaving] = useState(false);
  const [runnerStatus, setRunnerStatus] = useState(null);
  const [runningSnippetId, setRunningSnippetId] = useState('');
  const [sandboxInput, setSandboxInput] = useState('');
  const [devAgentLoading, setDevAgentLoading] = useState(false);
  const [lastInvite, setLastInvite] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer',
    groupName: ''
  });
  const [resourceForm, setResourceForm] = useState({
    label: '',
    type: 'repository',
    url: '',
    notes: ''
  });
  const [environmentForm, setEnvironmentForm] = useState({
    name: '',
    os: 'linux',
    runtime: '',
    repositoryUrl: '',
    branch: '',
    setupCommands: '',
    runCommands: '',
    testCommands: '',
    notes: '',
    groupName: ''
  });
  const [snippetForm, setSnippetForm] = useState({
    title: '',
    filePath: '',
    language: 'javascript',
    code: '',
    notes: '',
    groupName: '',
    status: 'draft'
  });
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

  const activeGroupNames = useMemo(
    () => (activeProject?.groups || []).map((group) => group.name).filter(Boolean),
    [activeProject]
  );

  const visibleMessages = useMemo(() => {
    const messages = activeProject?.messages || [];
    if (!chatGroup) return messages;

    return messages.filter((item) => (item.groupName || '') === chatGroup);
  }, [activeProject, chatGroup]);

  const activeMember = useMemo(() => {
    if (!activeProject) return null;
    return (activeProject.members || []).find((member) =>
      String(member.user || '') === String(currentUser.id || currentUser._id || '') ||
      String(member.email || '').toLowerCase() === String(currentUser.email || '').toLowerCase()
    ) || null;
  }, [activeProject, currentUser.email, currentUser.id, currentUser._id]);

  const canEditActiveProject = Boolean(activeProject?.canEdit || ['owner', 'editor'].includes(activeProject?.accessRole));
  const canInviteActiveProject = Boolean(activeProject?.canInvite);
  const latestMessages = visibleMessages.slice(-40);
  const sharedResources = activeProject?.resources || [];
  const codeEnvironments = activeProject?.codeEnvironments || [];
  const codeSnippets = activeProject?.codeSnippets || [];
  const codeRuns = activeProject?.codeRuns || [];
  const developerAgent = activeProject?.developerAgent || {};

  const visibleTasks = useMemo(() => {
    const tasks = activeProject?.tasks || [];
    if (!activeProject || canEditActiveProject) return tasks;

    const memberName = String(activeMember?.name || currentUser.name || '').toLowerCase();
    const memberEmail = String(activeMember?.email || currentUser.email || '').toLowerCase();
    const memberGroup = String(activeMember?.groupName || '').toLowerCase();
    const assignedTasks = tasks.filter((task) => {
      const owner = String(task.owner || '').toLowerCase();
      const groupName = String(task.groupName || '').toLowerCase();

      return (
        (memberName && owner === memberName) ||
        (memberEmail && owner === memberEmail) ||
        (memberGroup && groupName === memberGroup)
      );
    });

    return assignedTasks.length ? assignedTasks : tasks;
  }, [activeProject, activeMember, canEditActiveProject, currentUser.email, currentUser.name]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team-projects');
      const nextProjects = res.data?.projects || [];
      setProjects(nextProjects);
      setSummary(res.data?.summary || {});
      setCanCreateProjects(Boolean(res.data?.canCreateProjects));
      if (!activeProjectId && nextProjects[0]?._id) {
        setActiveProjectId(nextProjects[0]._id);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to load team workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadRunnerStatus = async () => {
    try {
      const res = await api.get('/team-projects/code-runner/status');
      setRunnerStatus(res.data?.runner || null);
    } catch {
      setRunnerStatus({
        enabled: false,
        mode: 'unavailable',
        note: 'Code runner status is unavailable right now.'
      });
    }
  };

  useEffect(() => {
    fetchProjects();
    loadRunnerStatus();
  }, []);

  useEffect(() => {
    setChatGroup('');
    setChatMessage('');
    setLastInvite(null);
    setInviteForm((prev) => ({ ...prev, groupName: '' }));
    setResourceForm({ label: '', type: 'repository', url: '', notes: '' });
    setEnvironmentForm({
      name: '',
      os: 'linux',
      runtime: '',
      repositoryUrl: '',
      branch: '',
      setupCommands: '',
      runCommands: '',
      testCommands: '',
      notes: '',
      groupName: ''
    });
    setSnippetForm({
      title: '',
      filePath: '',
      language: 'javascript',
      code: '',
      notes: '',
      groupName: '',
      status: 'draft'
    });
    setSandboxInput('');
    setUnreadMessages(0);
  }, [activeProject?._id]);

  useEffect(() => {
    if (!activeProject?._id || typeof EventSource === 'undefined') {
      setChatLiveStatus('offline');
      return undefined;
    }

    const token = getToken();
    if (!token) {
      setChatLiveStatus('offline');
      return undefined;
    }

    const baseURL = String(api.defaults.baseURL || '').replace(/\/+$/, '');
    const streamUrl = `${baseURL}/team-projects/${activeProject._id}/events?token=${encodeURIComponent(token)}`;
    let isClosed = false;
    const source = new EventSource(streamUrl);

    setChatLiveStatus('connecting');

    source.addEventListener('connected', () => {
      if (!isClosed) setChatLiveStatus('live');
    });

    source.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const incomingMessage = payload.message;
        const projectId = payload.projectId;

        if (!projectId || !incomingMessage?._id) return;

        setProjects((prev) => {
          let changed = false;
          const next = prev.map((project) => {
            if (project._id !== projectId) return project;

            const currentMessages = project.messages || [];
            const alreadyExists = currentMessages.some((item) => String(item._id) === String(incomingMessage._id));
            if (alreadyExists) return project;

            changed = true;
            return {
              ...project,
              messages: [...currentMessages, incomingMessage]
            };
          });

          if (changed) {
            setSummary(buildProjectSummary(next));
            if (!chatOpenRef.current) {
              setUnreadMessages((count) => count + 1);
            }
          }

          return next;
        });
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('resource', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId || !payload.resource?._id) return;

        setProjects((prev) => prev.map((project) => {
          if (project._id !== payload.projectId) return project;
          const resources = project.resources || [];
          if (resources.some((item) => String(item._id) === String(payload.resource._id))) return project;
          return { ...project, resources: [...resources, payload.resource] };
        }));
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('code_environment', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId || !payload.environment?._id) return;

        setProjects((prev) => prev.map((project) => {
          if (project._id !== payload.projectId) return project;
          const environments = project.codeEnvironments || [];
          if (environments.some((item) => String(item._id) === String(payload.environment._id))) return project;
          return { ...project, codeEnvironments: [...environments, payload.environment] };
        }));
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('code_snippet', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId || !payload.snippet?._id) return;

        setProjects((prev) => prev.map((project) => {
          if (project._id !== payload.projectId) return project;
          const snippets = project.codeSnippets || [];
          if (snippets.some((item) => String(item._id) === String(payload.snippet._id))) return project;
          return { ...project, codeSnippets: [...snippets, payload.snippet] };
        }));
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('code_run', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId || !payload.run?._id) return;

        setProjects((prev) => prev.map((project) => {
          if (project._id !== payload.projectId) return project;
          const runs = project.codeRuns || [];
          if (runs.some((item) => String(item._id) === String(payload.run._id))) return project;
          return { ...project, codeRuns: [...runs, payload.run] };
        }));
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('developer_agent', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId) return;

        setProjects((prev) => prev.map((project) =>
          project._id === payload.projectId
            ? { ...project, developerAgent: payload.developerAgent || {} }
            : project
        ));
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('project_update', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.projectId) return;

        setProjects((prev) => {
          const next = prev.map((project) =>
            project._id === payload.projectId
              ? {
                  ...project,
                  status: payload.status || project.status,
                  tasks: payload.tasks || project.tasks,
                  resources: payload.resources || project.resources,
                  codeEnvironments: payload.codeEnvironments || project.codeEnvironments,
                  codeSnippets: payload.codeSnippets || project.codeSnippets,
                  codeRuns: payload.codeRuns || project.codeRuns,
                  aiPlan: payload.aiPlan || project.aiPlan,
                  developerAgent: payload.developerAgent || project.developerAgent,
                  updatedAt: payload.updatedAt || project.updatedAt
                }
              : project
          );
          setSummary(buildProjectSummary(next));
          return next;
        });
      } catch {
        // Ignore malformed stream packets.
      }
    });

    source.addEventListener('access_removed', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const projectId = payload.projectId || activeProject._id;

        setProjects((prev) => {
          const next = prev.filter((project) => project._id !== projectId);
          setSummary(buildProjectSummary(next));
          return next;
        });
        setActiveProjectId('');
        setChatLiveStatus('offline');
        isClosed = true;
        source.close();
        alert(payload.message || 'Your access to this project was removed.');
      } catch {
        isClosed = true;
        source.close();
      }
    });

    source.onerror = () => {
      if (!isClosed) setChatLiveStatus('reconnecting');
    };

    return () => {
      isClosed = true;
      source.close();
      setChatLiveStatus('offline');
    };
  }, [activeProject?._id]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) {
      setUnreadMessages(0);
    }
  }, [chatOpen, activeProject?._id]);

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
    if (!project?.canEdit) {
      alert('Only project owners and editors can update status.');
      return;
    }

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
    if (!project?.canEdit) {
      alert('Only project owners and editors can update tasks.');
      return;
    }

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
    if (!canEditActiveProject) {
      alert('Only project owners and editors can generate the AI plan.');
      return;
    }

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

  const sendGroupMessage = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !chatMessage.trim()) {
      return;
    }

    try {
      setChatSending(true);
      const senderName = currentUser.name || currentUser.email || 'Project owner';
      const res = await api.post(`/team-projects/${activeProject._id}/messages`, {
        groupName: chatGroup,
        senderName,
        message: chatMessage
      });

      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
      setChatMessage('');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send message.');
    } finally {
      setChatSending(false);
    }
  };

  const createInvite = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canInviteActiveProject) {
      alert('Only the paid project owner can create invite links.');
      return;
    }

    try {
      setInviteLoading(true);
      const res = await api.post(`/team-projects/${activeProject._id}/invites`, inviteForm);
      setLastInvite(res.data?.invite || null);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!lastInvite?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(lastInvite.inviteUrl);
      alert('Invite link copied.');
    } catch {
      window.prompt('Copy invite link:', lastInvite.inviteUrl);
    }
  };

  const shareInviteOnWhatsApp = () => {
    if (!lastInvite?.whatsappText) return;
    openWhatsAppShare(lastInvite.whatsappText);
  };

  const updateMemberAccess = async (member, updates) => {
    if (!activeProject?._id || !member?._id || !canInviteActiveProject) {
      return;
    }

    try {
      const res = await api.patch(`/team-projects/${activeProject._id}/members/${member._id}`, updates);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update member access.');
    }
  };

  const addBuildResource = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add code/output links.');
      return;
    }

    if (!resourceForm.label.trim() || !resourceForm.url.trim()) {
      alert('Add a label and link first.');
      return;
    }

    try {
      setResourceSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/resources`, resourceForm);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
      setResourceForm({ label: '', type: 'repository', url: '', notes: '' });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add build link.');
    } finally {
      setResourceSaving(false);
    }
  };

  const addCodeEnvironment = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add Code Arena environments.');
      return;
    }

    if (!environmentForm.name.trim()) {
      alert('Add an environment name first.');
      return;
    }

    try {
      setEnvironmentSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/code-environments`, environmentForm);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
      setEnvironmentForm({
        name: '',
        os: 'linux',
        runtime: '',
        repositoryUrl: '',
        branch: '',
        setupCommands: '',
        runCommands: '',
        testCommands: '',
        notes: '',
        groupName: ''
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add Code Arena environment.');
    } finally {
      setEnvironmentSaving(false);
    }
  };

  const addCodeSnippet = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add code snippets.');
      return;
    }

    if (!snippetForm.title.trim() || !snippetForm.code.trim()) {
      alert('Add snippet title and code first.');
      return;
    }

    try {
      setSnippetSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/code-snippets`, snippetForm);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
      setSnippetForm({
        title: '',
        filePath: '',
        language: 'javascript',
        code: '',
        notes: '',
        groupName: '',
        status: 'draft'
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add code snippet.');
    } finally {
      setSnippetSaving(false);
    }
  };

  const runSnippetInSandbox = async (snippet) => {
    if (!activeProject?._id || !snippet?._id) return;

    if (!canEditActiveProject) {
      alert('Only project owners and editors can run sandbox code.');
      return;
    }

    if (!runnerStatus?.enabled) {
      alert(runnerStatus?.note || 'Docker sandbox is not enabled on this backend yet.');
      return;
    }

    try {
      setRunningSnippetId(String(snippet._id));
      const res = await api.post(`/team-projects/${activeProject._id}/code-snippets/${snippet._id}/run`, {
        language: snippet.language,
        stdin: sandboxInput
      });
      if (res.data?.runner) {
        setRunnerStatus(res.data.runner);
      }
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
    } catch (err) {
      if (err?.response?.data?.runner) {
        setRunnerStatus(err.response.data.runner);
      }
      alert(err?.response?.data?.message || 'Docker sandbox run failed.');
    } finally {
      setRunningSnippetId('');
    }
  };

  const generateDeveloperAgent = async () => {
    if (!activeProject?._id) return;

    try {
      setDevAgentLoading(true);
      const res = await api.post(`/team-projects/${activeProject._id}/dev-agent`);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
    } catch (err) {
      alert(err?.response?.data?.message || 'AI developer helper failed.');
    } finally {
      setDevAgentLoading(false);
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
      ...(project.tasks || []).map((task) => `- ${task.title} | ${task.groupName || 'No group'} | ${task.owner || 'Unassigned'} | ${task.status}`),
      '',
      'Recent chat:',
      ...((project.messages || []).slice(-5).map((item) =>
        `- ${item.senderName || 'Team'}${item.groupName ? ` (${item.groupName})` : ''}: ${item.message}`
      ))
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
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Team Workspace</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Work with other freelancers on bigger client projects
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                Invite freelancers with a link, assign roles, split tasks, chat by group, and let AI prepare the daily delivery plan before you invoice the client.
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
            ['Messages', summary.messages || 0]
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
                          <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">
                            {statusLabel(project.accessRole || 'member')}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                            {statusLabel(project.status)}
                          </span>
                          <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                            {formatCurrency(project.budget, project.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Chat</p>
                          <p className="mt-1 text-sm font-black text-white">{project.messages?.length || 0} updates</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="premium-panel p-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">No team project yet</p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  {canCreateProjects ? 'Create your first delivery room' : 'No shared project found'}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-zinc-500">
                  {canCreateProjects
                    ? 'Use it when a project is too big for one freelancer and you need a designer, developer, writer, marketer, or assistant to help.'
                    : 'Ask the project owner to send you a ClientFlow AI team invite link. After you accept it, only that shared project will appear here.'}
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
                      disabled={!canEditActiveProject}
                      className="input py-3 text-xs"
                    >
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => generateAiPlan(activeProject._id)}
                      disabled={planLoading === activeProject._id || !canEditActiveProject}
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

                <div className="mt-8 rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Invite freelancers</p>
                      <h3 className="mt-1 text-xl font-black text-white">Bring another freelancer into this project</h3>
                      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                        Share a secure link by WhatsApp or email. They sign up or login, then join only this project with the permission you choose.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                      Your role: {statusLabel(activeProject.accessRole || 'member')}
                    </span>
                  </div>

                  {canInviteActiveProject ? (
                    <>
                      <form onSubmit={createInvite} className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_160px_120px]">
                        <input
                          type="email"
                          value={inviteForm.email}
                          onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="Freelancer email optional"
                          className="input py-3 text-sm"
                        />
                        <select
                          value={inviteForm.role}
                          onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <select
                          value={inviteForm.groupName}
                          onChange={(event) => setInviteForm((prev) => ({ ...prev, groupName: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          <option value="">No group</option>
                          {activeGroupNames.map((groupName) => (
                            <option key={groupName} value={groupName}>{groupName}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={inviteLoading}
                          className="btn btn-primary px-4 py-3 text-xs"
                        >
                          {inviteLoading ? 'Creating...' : 'Create Link'}
                        </button>
                      </form>

                      {lastInvite?.inviteUrl && (
                        <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Invite link</p>
                          <p className="mt-2 break-all text-sm font-semibold leading-relaxed text-zinc-300">
                            {lastInvite.inviteUrl}
                          </p>
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button type="button" onClick={copyInviteLink} className="btn btn-secondary px-4 py-3 text-xs">
                              Copy Link
                            </button>
                            <button type="button" onClick={shareInviteOnWhatsApp} className="btn btn-secondary px-4 py-3 text-xs">
                              Share WhatsApp
                            </button>
                            <a
                              href={`mailto:${encodeURIComponent(lastInvite.email || '')}?subject=${encodeURIComponent(lastInvite.emailSubject || 'Join project')}&body=${encodeURIComponent(lastInvite.emailBody || lastInvite.inviteUrl)}`}
                              className="btn btn-secondary px-4 py-3 text-center text-xs"
                            >
                              Open Email
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="mt-5">
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Project members</p>
                        <div className="grid gap-3">
                          {(activeProject.members || []).filter((member) => member.status !== 'removed').map((member) => (
                            <div key={member._id || member.email} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-white">{member.name || member.email || 'Team member'}</p>
                                  <p className="mt-1 text-xs font-medium text-zinc-500">
                                    {member.email || 'No email'} {member.groupName ? `- ${member.groupName}` : ''}
                                  </p>
                                </div>
                                {member.role === 'owner' ? (
                                  <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                                    Owner
                                  </span>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-[120px_150px_90px]">
                                    <select
                                      value={member.role || 'viewer'}
                                      onChange={(event) => updateMemberAccess(member, { role: event.target.value })}
                                      className="input py-2 text-xs"
                                    >
                                      <option value="viewer">Viewer</option>
                                      <option value="editor">Editor</option>
                                    </select>
                                    <select
                                      value={member.groupName || ''}
                                      onChange={(event) => updateMemberAccess(member, { groupName: event.target.value })}
                                      className="input py-2 text-xs"
                                    >
                                      <option value="">No group</option>
                                      {activeGroupNames.map((groupName) => (
                                        <option key={groupName} value={groupName}>{groupName}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => updateMemberAccess(member, { status: 'removed' })}
                                      className="rounded-xl border border-red-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/10"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm font-semibold leading-relaxed text-zinc-400">
                      Only the paid project owner can create invite links. Editors and viewers can work inside the project, update allowed tasks, and use group chat.
                    </div>
                  )}
                </div>

                <div className="mt-8 rounded-3xl border border-violet-400/15 bg-violet-400/[0.04] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Build & output</p>
                      <h3 className="mt-1 text-xl font-black text-white">Shared code, preview, design, and delivery links</h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                        Everyone in this project can see the same code links and output. Owners and editors can add new links.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateDeveloperAgent}
                      disabled={devAgentLoading}
                      className="btn btn-secondary px-5 py-3 text-xs"
                    >
                      {devAgentLoading ? 'Thinking...' : 'Ask Dev AI'}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-3">
                      {sharedResources.length ? (
                        sharedResources.map((resource) => (
                          <a
                            key={resource._id || resource.url}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-2xl border border-white/8 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-violet-300/25"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-white">{resource.label}</p>
                                <p className="mt-1 break-all text-xs font-medium text-zinc-500">{resource.url}</p>
                              </div>
                              <span className="rounded-full border border-violet-300/15 bg-violet-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-violet-200">
                                {statusLabel(resource.type || 'other')}
                              </span>
                            </div>
                            {resource.notes && (
                              <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-400">{resource.notes}</p>
                            )}
                          </a>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                          <p className="text-sm font-black text-white">No code or output links yet</p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                            Add repository, live preview, design, or requirement links so the whole team works from one place.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      {canEditActiveProject ? (
                        <form onSubmit={addBuildResource} className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Add shared link</p>
                          <input
                            value={resourceForm.label}
                            onChange={(event) => setResourceForm((prev) => ({ ...prev, label: event.target.value }))}
                            placeholder="GitHub repo, live preview, Figma..."
                            className="input py-3 text-sm"
                          />
                          <select
                            value={resourceForm.type}
                            onChange={(event) => setResourceForm((prev) => ({ ...prev, type: event.target.value }))}
                            className="input py-3 text-sm"
                          >
                            <option value="repository">Repository</option>
                            <option value="preview">Live preview</option>
                            <option value="design">Design</option>
                            <option value="document">Document</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            value={resourceForm.url}
                            onChange={(event) => setResourceForm((prev) => ({ ...prev, url: event.target.value }))}
                            placeholder="https://..."
                            className="input py-3 text-sm"
                          />
                          <textarea
                            value={resourceForm.notes}
                            onChange={(event) => setResourceForm((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="What should the team check here?"
                            rows="3"
                            className="input min-h-[88px] resize-none py-3 text-sm"
                          />
                          <button
                            type="submit"
                            disabled={resourceSaving}
                            className="btn btn-primary w-full py-3 text-xs"
                          >
                            {resourceSaving ? 'Adding...' : 'Add Link'}
                          </button>
                        </form>
                      ) : (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Viewer mode</p>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
                            You can view build links and chat with the team. Ask the owner to make you an editor if you need to add links or update work.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Code Arena</p>
                        <h4 className="mt-1 text-lg font-black text-white">OS workspaces, commands, snippets, and outputs</h4>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                          Share Linux, Windows, macOS, Android, iOS, or server setup instructions so every freelancer works from the same environment.
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
                        {runnerStatus?.enabled ? 'Docker ready' : 'Safe MVP'}
                      </span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-black text-white">
                            {runnerStatus?.enabled ? 'Docker sandbox execution is enabled' : 'Docker sandbox execution is off'}
                          </p>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">
                            {runnerStatus?.note || 'Use this arena to share code now. Connect a Docker runner when you want real code execution.'}
                          </p>
                        </div>
                        <span className={`w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                          runnerStatus?.enabled
                            ? 'border border-emerald-300/15 bg-emerald-300/10 text-emerald-200'
                            : 'border border-amber-300/15 bg-amber-300/10 text-amber-200'
                        }`}>
                          {runnerStatus?.mode || 'disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">OS environments</p>
                        {codeEnvironments.length ? (
                          codeEnvironments.map((environment) => (
                            <div key={environment._id || environment.name} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-black text-white">{environment.name}</p>
                                  <p className="mt-1 text-xs font-medium text-zinc-500">
                                    {statusLabel(environment.os)} {environment.runtime ? `- ${environment.runtime}` : ''} {environment.branch ? `- ${environment.branch}` : ''}
                                  </p>
                                </div>
                                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-200">
                                  {environment.groupName || 'All team'}
                                </span>
                              </div>
                              {environment.repositoryUrl && (
                                <p className="mt-3 break-all text-xs font-medium text-zinc-400">{environment.repositoryUrl}</p>
                              )}
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                {[
                                  ['Setup', environment.setupCommands],
                                  ['Run', environment.runCommands],
                                  ['Test', environment.testCommands]
                                ].map(([label, commands]) => (
                                  <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                    {commands?.length ? (
                                      <pre className="whitespace-pre-wrap break-words text-[11px] font-semibold leading-relaxed text-zinc-300">{commands.join('\n')}</pre>
                                    ) : (
                                      <p className="text-[11px] font-medium text-zinc-600">Not added</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {environment.notes && (
                                <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">{environment.notes}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                            <p className="text-sm font-black text-white">No OS workspace yet</p>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                              Add Linux/server setup for backend work or Android/iOS setup for app projects.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Code snippets</p>
                        {codeSnippets.length ? (
                          codeSnippets.slice(-4).map((snippet) => {
                            const snippetLanguage = String(snippet.language || '').toLowerCase();
                            const isRunnable = runnableLanguages.includes(snippetLanguage);
                            const canRun = Boolean(runnerStatus?.enabled && isRunnable && canEditActiveProject);

                            return (
                              <div key={snippet._id || snippet.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black text-white">{snippet.title}</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500">{snippet.filePath || snippet.language}</p>
                                  </div>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                    {statusLabel(snippet.status)}
                                  </span>
                                </div>
                                <pre className="mt-3 max-h-44 overflow-auto rounded-xl border border-white/8 bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-zinc-300">{snippet.code}</pre>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-[11px] font-semibold text-zinc-500">
                                    {isRunnable ? `Runnable: ${statusLabel(snippetLanguage)}` : 'Execution supports JavaScript, Python, and Shell for now.'}
                                  </p>
                                  <button
                                    type="button"
                                    disabled={!canRun || runningSnippetId === String(snippet._id)}
                                    onClick={() => runSnippetInSandbox(snippet)}
                                    className="btn btn-primary px-4 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {runningSnippetId === String(snippet._id) ? 'Running...' : 'Run in Docker'}
                                  </button>
                                </div>
                                {snippet.notes && (
                                  <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">{snippet.notes}</p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                            <p className="text-sm font-black text-white">No code snippet yet</p>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                              Share important code, config, scripts, or review patches here.
                            </p>
                          </div>
                        )}

                        {canEditActiveProject && (
                          <textarea
                            value={sandboxInput}
                            onChange={(event) => setSandboxInput(event.target.value)}
                            placeholder="Optional stdin input for sandbox runs"
                            rows="2"
                            className="input min-h-[70px] resize-none py-3 text-sm"
                          />
                        )}

                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Latest sandbox output</p>
                          {codeRuns.length ? (
                            <div className="mt-3 space-y-3">
                              {codeRuns.slice(-3).reverse().map((run) => (
                                <div key={run._id || `${run.title}-${run.createdAt}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-xs font-black text-white">{run.title || 'Sandbox run'}</p>
                                      <p className="mt-1 text-[11px] font-medium text-zinc-500">
                                        {statusLabel(run.status)} - exit {run.exitCode ?? 'n/a'} - {run.durationMs || 0}ms
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                      {run.language || 'code'}
                                    </span>
                                  </div>
                                  {run.stdout && (
                                    <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-emerald-200">{run.stdout}</pre>
                                  )}
                                  {run.stderr && (
                                    <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-rose-200">{run.stderr}</pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
                              Run a JavaScript, Python, or Shell snippet after Docker sandbox is enabled.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEditActiveProject && (
                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <form onSubmit={addCodeEnvironment} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Add OS workspace</p>
                          <div className="grid gap-3">
                            <input
                              value={environmentForm.name}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, name: event.target.value }))}
                              placeholder="Linux backend, Android app, Windows desktop..."
                              className="input py-3 text-sm"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <select
                                value={environmentForm.os}
                                onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, os: event.target.value }))}
                                className="input py-3 text-sm"
                              >
                                {codeOsOptions.map((os) => (
                                  <option key={os} value={os}>{statusLabel(os)}</option>
                                ))}
                              </select>
                              <input
                                value={environmentForm.runtime}
                                onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, runtime: event.target.value }))}
                                placeholder="Node 20, Python 3.12, Java..."
                                className="input py-3 text-sm"
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                              <input
                                value={environmentForm.repositoryUrl}
                                onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, repositoryUrl: event.target.value }))}
                                placeholder="Repository URL"
                                className="input py-3 text-sm"
                              />
                              <input
                                value={environmentForm.branch}
                                onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, branch: event.target.value }))}
                                placeholder="Branch"
                                className="input py-3 text-sm"
                              />
                            </div>
                            <select
                              value={environmentForm.groupName}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, groupName: event.target.value }))}
                              className="input py-3 text-sm"
                            >
                              <option value="">All groups</option>
                              {activeGroupNames.map((groupName) => (
                                <option key={groupName} value={groupName}>{groupName}</option>
                              ))}
                            </select>
                            <textarea
                              value={environmentForm.setupCommands}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, setupCommands: event.target.value }))}
                              placeholder="Setup commands, one per line"
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <textarea
                              value={environmentForm.runCommands}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, runCommands: event.target.value }))}
                              placeholder="Run commands, one per line"
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <textarea
                              value={environmentForm.testCommands}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, testCommands: event.target.value }))}
                              placeholder="Test commands, one per line"
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <textarea
                              value={environmentForm.notes}
                              onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, notes: event.target.value }))}
                              placeholder="OS notes, secrets needed, output expectation..."
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <button type="submit" disabled={environmentSaving} className="btn btn-primary py-3 text-xs">
                              {environmentSaving ? 'Adding...' : 'Add Workspace'}
                            </button>
                          </div>
                        </form>

                        <form onSubmit={addCodeSnippet} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Add code snippet</p>
                          <div className="grid gap-3">
                            <input
                              value={snippetForm.title}
                              onChange={(event) => setSnippetForm((prev) => ({ ...prev, title: event.target.value }))}
                              placeholder="Login fix, Dockerfile, API route..."
                              className="input py-3 text-sm"
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                value={snippetForm.filePath}
                                onChange={(event) => setSnippetForm((prev) => ({ ...prev, filePath: event.target.value }))}
                                placeholder="src/App.jsx"
                                className="input py-3 text-sm"
                              />
                              <select
                                value={snippetForm.language}
                                onChange={(event) => setSnippetForm((prev) => ({ ...prev, language: event.target.value }))}
                                className="input py-3 text-sm"
                              >
                                {runnableLanguages.map((language) => (
                                  <option key={language} value={language}>{statusLabel(language)}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <select
                                value={snippetForm.groupName}
                                onChange={(event) => setSnippetForm((prev) => ({ ...prev, groupName: event.target.value }))}
                                className="input py-3 text-sm"
                              >
                                <option value="">All groups</option>
                                {activeGroupNames.map((groupName) => (
                                  <option key={groupName} value={groupName}>{groupName}</option>
                                ))}
                              </select>
                              <select
                                value={snippetForm.status}
                                onChange={(event) => setSnippetForm((prev) => ({ ...prev, status: event.target.value }))}
                                className="input py-3 text-sm"
                              >
                                <option value="draft">Draft</option>
                                <option value="review">Review</option>
                                <option value="approved">Approved</option>
                              </select>
                            </div>
                            <textarea
                              value={snippetForm.code}
                              onChange={(event) => setSnippetForm((prev) => ({ ...prev, code: event.target.value }))}
                              placeholder="Paste code, config, command output, or patch here"
                              rows="8"
                              className="input min-h-[190px] resize-y py-3 font-mono text-xs"
                            />
                            <textarea
                              value={snippetForm.notes}
                              onChange={(event) => setSnippetForm((prev) => ({ ...prev, notes: event.target.value }))}
                              placeholder="What should reviewers check?"
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <button type="submit" disabled={snippetSaving} className="btn btn-primary py-3 text-xs">
                              {snippetSaving ? 'Adding...' : 'Add Snippet'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">AI developer helper</p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-300">
                          {developerAgent.summary || 'Ask Dev AI to prepare next development steps from tasks and shared links.'}
                        </p>
                      </div>
                    </div>
                    {(developerAgent.nextSteps?.length || developerAgent.codeChecklist?.length) && (
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Next development steps</p>
                          <div className="space-y-2">
                            {(developerAgent.nextSteps || []).map((item) => (
                              <p key={item} className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-semibold leading-relaxed text-zinc-300">{item}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Code review checklist</p>
                          <div className="space-y-2">
                            {(developerAgent.codeChecklist || []).map((item) => (
                              <p key={item} className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-semibold leading-relaxed text-zinc-300">{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Group chat</p>
                      <h3 className="mt-1 text-xl font-black text-white">Keep team updates inside the project</h3>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                        Send updates to the whole project or filter the conversation by group.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                      <span className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                        chatLiveStatus === 'live'
                          ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                          : chatLiveStatus === 'connecting' || chatLiveStatus === 'reconnecting'
                            ? 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200'
                            : 'border-white/10 bg-white/[0.04] text-zinc-400'
                      }`}>
                        {chatLiveStatus === 'live'
                          ? 'Live'
                          : chatLiveStatus === 'connecting'
                            ? 'Connecting'
                            : chatLiveStatus === 'reconnecting'
                              ? 'Reconnecting'
                              : 'Offline'}
                      </span>
                      <select
                        value={chatGroup}
                        onChange={(event) => setChatGroup(event.target.value)}
                        className="input w-full py-3 text-xs lg:w-56"
                      >
                        <option value="">All project chat</option>
                        {activeGroupNames.map((groupName) => (
                          <option key={groupName} value={groupName}>{groupName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-white/8 bg-black/20 p-3 sm:p-4">
                    {visibleMessages.length ? (
                      visibleMessages.slice(-40).map((item) => (
                        <div key={item._id || `${item.senderName}-${item.createdAt}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-white">{item.senderName || 'Team member'}</p>
                              <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
                                {item.groupName || 'All project'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                              {formatMessageTime(item.createdAt)}
                            </p>
                          </div>
                          <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-300">
                            {item.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                        <p className="text-sm font-black text-white">No messages yet</p>
                        <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                          Share the first project update, blocker, or handover note for this team.
                        </p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendGroupMessage} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px]">
                    <textarea
                      value={chatMessage}
                      onChange={(event) => setChatMessage(event.target.value)}
                      placeholder={chatGroup ? `Message ${chatGroup}` : 'Write a project update for the team'}
                      rows="3"
                      maxLength="1200"
                      className="input min-h-[96px] resize-none py-4 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={chatSending || !chatMessage.trim()}
                      className="btn btn-primary h-full min-h-[56px] self-stretch px-5 py-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {chatSending ? 'Sending...' : 'Send Update'}
                    </button>
                  </form>
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
                      {visibleTasks.map((task, index) => (
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
                                (task._id && item._id === task._id) || (!task._id && currentIndex === index)
                                  ? { ...item, status: event.target.value }
                                  : item
                              );
                              updateProjectTasks(activeProject, nextTasks);
                            }}
                            disabled={!canEditActiveProject}
                            className="input py-3 text-xs"
                          >
                            {taskStatuses.map((status) => (
                              <option key={status} value={status}>{statusLabel(status)}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {!visibleTasks.length && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                          <p className="text-sm font-black text-white">No assigned tasks yet</p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                            Ask the project owner to assign tasks by your name or group.
                          </p>
                        </div>
                      )}
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
            {canCreateProjects ? (
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
            ) : (
              <div className="premium-panel p-5 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Joined workspace</p>
                <h2 className="mt-2 text-2xl font-black text-white">You are a project member</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">
                  You can open projects shared with you, see assigned work, and send group chat updates. Creating new team workspaces and invite links is available for the paid project owner.
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Your access</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {statusLabel(activeProject?.accessRole || 'Member')}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Assigned tasks</p>
                    <p className="mt-1 text-lg font-black text-white">{visibleTasks.length}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {activeProject && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 print:hidden sm:right-6">
          {chatOpen && (
            <div className="mb-4 w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#090d14]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
              <div className="border-b border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Project chat</p>
                    <h3 className="mt-1 text-lg font-black text-white">{activeProject.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                    chatLiveStatus === 'live'
                      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                      : chatLiveStatus === 'connecting' || chatLiveStatus === 'reconnecting'
                        ? 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200'
                        : 'border-white/10 bg-white/[0.04] text-zinc-400'
                  }`}>
                    {chatLiveStatus === 'live'
                      ? 'Live'
                      : chatLiveStatus === 'connecting'
                        ? 'Connecting'
                        : chatLiveStatus === 'reconnecting'
                          ? 'Reconnecting'
                          : 'Offline'}
                  </span>
                  <select
                    value={chatGroup}
                    onChange={(event) => setChatGroup(event.target.value)}
                    className="input flex-1 py-2 text-xs"
                  >
                    <option value="">All project chat</option>
                    {activeGroupNames.map((groupName) => (
                      <option key={groupName} value={groupName}>{groupName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[52vh] space-y-3 overflow-y-auto p-4">
                {latestMessages.length ? (
                  latestMessages.map((item) => (
                    <div key={item._id || `${item.senderName}-${item.createdAt}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white">{item.senderName || 'Team member'}</p>
                          <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
                            {item.groupName || 'All'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                          {formatMessageTime(item.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-300">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <p className="text-sm font-black text-white">No messages yet</p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                      Send the first update for this project.
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={sendGroupMessage} className="border-t border-white/10 p-4">
                <textarea
                  value={chatMessage}
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder={chatGroup ? `Message ${chatGroup}` : 'Write a team update'}
                  rows="3"
                  maxLength="1200"
                  className="input min-h-[90px] resize-none py-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={chatSending || !chatMessage.trim()}
                  className="btn btn-primary mt-3 w-full py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {chatSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() => setChatOpen((value) => !value)}
            className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400 text-slate-950 shadow-2xl shadow-sky-900/40 transition hover:-translate-y-1 hover:bg-sky-300"
            aria-label="Open project chat"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m8-2a9 9 0 11-3.6-7.2L21 3v5h-5" />
            </svg>
            {unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#090d14] bg-red-500 px-1.5 text-[10px] font-black text-white">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
