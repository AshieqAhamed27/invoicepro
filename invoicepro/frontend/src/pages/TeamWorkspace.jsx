import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getToken, getUser } from '../utils/auth';
import { openWhatsAppShare } from '../utils/whatsapp';

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];
const projectStatuses = ['planning', 'active', 'review', 'completed', 'paused'];
const taskStatuses = ['todo', 'doing', 'done', 'blocked'];
const priorities = ['low', 'normal', 'high'];
const issueTypes = ['bug', 'feature', 'task', 'client_request'];
const issueStatuses = ['open', 'in_progress', 'review', 'done'];
const releaseStatuses = ['planned', 'in_progress', 'shipped'];
const wikiCategories = ['setup', 'client', 'delivery', 'qa', 'handover', 'other'];

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

const blankIssue = {
  title: '',
  type: 'task',
  priority: 'normal',
  status: 'open',
  owner: '',
  groupName: '',
  dueDate: '',
  notes: ''
};

const blankRelease = {
  version: '',
  title: '',
  status: 'planned',
  targetDate: '',
  summary: ''
};

const blankWikiPage = {
  title: '',
  category: 'setup',
  content: ''
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
  openIssues: projects.reduce(
    (sum, project) => sum + (project.maintenanceIssues || []).filter((issue) => issue.status !== 'done').length,
    0
  ),
  releases: projects.reduce((sum, project) => sum + (project.releases?.length || 0), 0),
  docs: projects.reduce((sum, project) => sum + (project.wikiPages?.length || 0), 0),
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
  const [devAgentLoading, setDevAgentLoading] = useState(false);
  const [issueSaving, setIssueSaving] = useState(false);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [wikiSaving, setWikiSaving] = useState(false);
  const [maintenanceAgentLoading, setMaintenanceAgentLoading] = useState(false);
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
  const [issueForm, setIssueForm] = useState({ ...blankIssue });
  const [releaseForm, setReleaseForm] = useState({ ...blankRelease });
  const [wikiForm, setWikiForm] = useState({ ...blankWikiPage });
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
  const developerAgent = activeProject?.developerAgent || {};
  const maintenanceIssues = activeProject?.maintenanceIssues || [];
  const openMaintenanceIssues = maintenanceIssues.filter((issue) => issue.status !== 'done');
  const releases = activeProject?.releases || [];
  const wikiPages = activeProject?.wikiPages || [];
  const maintenanceAgent = activeProject?.maintenanceAgent || {};

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

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setChatGroup('');
    setChatMessage('');
    setLastInvite(null);
    setInviteForm((prev) => ({ ...prev, groupName: '' }));
    setResourceForm({ label: '', type: 'repository', url: '', notes: '' });
    setIssueForm({ ...blankIssue });
    setReleaseForm({ ...blankRelease });
    setWikiForm({ ...blankWikiPage });
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
                  maintenanceIssues: payload.maintenanceIssues || project.maintenanceIssues,
                  releases: payload.releases || project.releases,
                  wikiPages: payload.wikiPages || project.wikiPages,
                  aiPlan: payload.aiPlan || project.aiPlan,
                  developerAgent: payload.developerAgent || project.developerAgent,
                  maintenanceAgent: payload.maintenanceAgent || project.maintenanceAgent,
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

  const addMaintenanceIssue = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add issues.');
      return;
    }

    if (!issueForm.title.trim()) {
      alert('Add an issue title first.');
      return;
    }

    try {
      setIssueSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/issues`, issueForm);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
      setIssueForm({ ...blankIssue });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add issue.');
    } finally {
      setIssueSaving(false);
    }
  };

  const updateMaintenanceIssue = async (issue, updates) => {
    if (!activeProject?._id || !issue?._id || !canEditActiveProject) return;

    try {
      const res = await api.patch(`/team-projects/${activeProject._id}/issues/${issue._id}`, updates);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update issue.');
    }
  };

  const addRelease = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add releases.');
      return;
    }

    if (!releaseForm.version.trim() || !releaseForm.title.trim()) {
      alert('Add a version and release title first.');
      return;
    }

    try {
      setReleaseSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/releases`, releaseForm);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
      setReleaseForm({ ...blankRelease });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add release.');
    } finally {
      setReleaseSaving(false);
    }
  };

  const updateRelease = async (release, updates) => {
    if (!activeProject?._id || !release?._id || !canEditActiveProject) return;

    try {
      const res = await api.patch(`/team-projects/${activeProject._id}/releases/${release._id}`, updates);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update release.');
    }
  };

  const addWikiPage = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add docs.');
      return;
    }

    if (!wikiForm.title.trim() || !wikiForm.content.trim()) {
      alert('Add a doc title and content first.');
      return;
    }

    try {
      setWikiSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/wiki-pages`, wikiForm);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
      setWikiForm({ ...blankWikiPage });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add project doc.');
    } finally {
      setWikiSaving(false);
    }
  };

  const generateMaintenanceAgent = async () => {
    if (!activeProject?._id) return;

    try {
      setMaintenanceAgentLoading(true);
      const res = await api.post(`/team-projects/${activeProject._id}/maintenance-agent`);
      setProjects((prev) => {
        const next = prev.map((item) => item._id === activeProject._id ? res.data.project : item);
        setSummary(buildProjectSummary(next));
        return next;
      });
    } catch (err) {
      if (err?.response?.status === 404) {
        alert('AI Maintainer is in the latest code, but your live Render backend is not redeployed yet. Push the backend changes and redeploy Render, then refresh this page.');
      } else {
        alert(err?.response?.data?.message || 'AI maintainer failed.');
      }
    } finally {
      setMaintenanceAgentLoading(false);
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
      'Open issues:',
      ...((project.maintenanceIssues || [])
        .filter((issue) => issue.status !== 'done')
        .map((issue) => `- ${issue.title} | ${issue.type || 'task'} | ${issue.priority || 'normal'} | ${issue.status || 'open'}`)),
      '',
      'Releases:',
      ...((project.releases || []).map((release) =>
        `- ${release.version}: ${release.title} | ${release.status || 'planned'}`
      )),
      '',
      'Project docs:',
      ...((project.wikiPages || []).map((page) => `- ${page.title} | ${page.category || 'other'}`)),
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

        <section className="reveal reveal-delay-1 mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
          {[
            ['Projects', summary.total || 0],
            ['Active', summary.active || 0],
            ['Groups', summary.groups || 0],
            ['Open tasks', summary.openTasks || 0],
            ['Open issues', summary.openIssues || 0],
            ['Releases', summary.releases || 0],
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

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
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
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Issues</p>
                          <p className="mt-1 text-sm font-black text-white">
                            {(project.maintenanceIssues || []).filter((issue) => issue.status !== 'done').length} open
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Releases</p>
                          <p className="mt-1 text-sm font-black text-white">{project.releases?.length || 0} versions</p>
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

                <div className="mt-8 rounded-3xl border border-sky-400/15 bg-sky-400/[0.04] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Project maintenance hub</p>
                      <h3 className="mt-1 text-xl font-black text-white">Issues, releases, docs, and AI maintainer</h3>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-zinc-500">
                        Use this like a simple GitHub-style project room: track bugs and improvements, plan versions, save project docs, and keep long-term maintenance clear for every freelancer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateMaintenanceAgent}
                      disabled={maintenanceAgentLoading}
                      className="btn btn-secondary px-5 py-3 text-xs"
                    >
                      {maintenanceAgentLoading ? 'Checking...' : 'Ask AI Maintainer'}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Open issues', openMaintenanceIssues.length],
                      ['High priority', maintenanceIssues.filter((issue) => issue.status !== 'done' && issue.priority === 'high').length],
                      ['Releases', releases.length],
                      ['Project docs', wikiPages.length]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                        <p className="mt-1 text-2xl font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">AI maintainer</p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-300">
                          {maintenanceAgent.summary || 'Ask AI Maintainer to review open issues, release plans, and project docs.'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Health score</p>
                        <p className={`mt-1 text-2xl font-black ${
                          Number(maintenanceAgent.healthScore || 75) >= 80
                            ? 'text-emerald-300'
                            : Number(maintenanceAgent.healthScore || 75) >= 55
                              ? 'text-yellow-300'
                              : 'text-red-300'
                        }`}>
                          {Number(maintenanceAgent.healthScore || 75)}/100
                        </p>
                      </div>
                    </div>
                    {maintenanceAgent.nextAction && (
                      <p className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-300/10 p-4 text-sm font-black leading-relaxed text-sky-100">
                        {maintenanceAgent.nextAction}
                      </p>
                    )}
                    {(maintenanceAgent.releaseChecklist?.length || maintenanceAgent.riskNotes?.length) && (
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Release checklist</p>
                          <div className="space-y-2">
                            {(maintenanceAgent.releaseChecklist || []).map((item) => (
                              <p key={item} className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-semibold leading-relaxed text-zinc-300">{item}</p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">Risk notes</p>
                          <div className="space-y-2">
                            {(maintenanceAgent.riskNotes || []).map((item) => (
                              <p key={item} className="rounded-xl border border-yellow-300/15 bg-yellow-300/10 p-3 text-xs font-semibold leading-relaxed text-yellow-100">{item}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Issues</p>
                          <h4 className="mt-1 text-lg font-black text-white">Bugs, improvements, and client requests</h4>
                        </div>
                        <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">
                          {openMaintenanceIssues.length} open
                        </span>
                      </div>

                      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {maintenanceIssues.length ? (
                          maintenanceIssues.map((issue) => (
                            <div key={issue._id || issue.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <p className="font-black text-white">{issue.title}</p>
                                  <p className="mt-1 text-xs font-medium text-zinc-500">
                                    {statusLabel(issue.type)} - {statusLabel(issue.priority)} priority - {issue.owner || 'Unassigned'} - {formatDate(issue.dueDate)}
                                  </p>
                                  {issue.notes && (
                                    <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-400">{issue.notes}</p>
                                  )}
                                </div>
                                <select
                                  value={issue.status || 'open'}
                                  onChange={(event) => updateMaintenanceIssue(issue, { status: event.target.value })}
                                  disabled={!canEditActiveProject}
                                  className="input py-2 text-xs lg:w-36"
                                >
                                  {issueStatuses.map((status) => (
                                    <option key={status} value={status}>{statusLabel(status)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                            <p className="text-sm font-black text-white">No maintenance issues yet</p>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                              Add bugs, requested changes, future improvements, or QA work here.
                            </p>
                          </div>
                        )}
                      </div>

                      {canEditActiveProject && (
                        <form onSubmit={addMaintenanceIssue} className="mt-4 grid gap-3">
                          <input
                            value={issueForm.title}
                            onChange={(event) => setIssueForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="Issue title, bug, improvement, or client request"
                            className="input py-3 text-sm"
                          />
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <select
                              value={issueForm.type}
                              onChange={(event) => setIssueForm((prev) => ({ ...prev, type: event.target.value }))}
                              className="input py-3 text-sm"
                            >
                              {issueTypes.map((type) => (
                                <option key={type} value={type}>{statusLabel(type)}</option>
                              ))}
                            </select>
                            <select
                              value={issueForm.priority}
                              onChange={(event) => setIssueForm((prev) => ({ ...prev, priority: event.target.value }))}
                              className="input py-3 text-sm"
                            >
                              {priorities.map((priority) => (
                                <option key={priority} value={priority}>{statusLabel(priority)}</option>
                              ))}
                            </select>
                            <select
                              value={issueForm.groupName}
                              onChange={(event) => setIssueForm((prev) => ({ ...prev, groupName: event.target.value }))}
                              className="input py-3 text-sm"
                            >
                              <option value="">No group</option>
                              {activeGroupNames.map((groupName) => (
                                <option key={groupName} value={groupName}>{groupName}</option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={issueForm.dueDate}
                              onChange={(event) => setIssueForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                              className="input py-3 text-sm"
                            />
                          </div>
                          <input
                            value={issueForm.owner}
                            onChange={(event) => setIssueForm((prev) => ({ ...prev, owner: event.target.value }))}
                            placeholder="Owner name or email"
                            className="input py-3 text-sm"
                          />
                          <textarea
                            value={issueForm.notes}
                            onChange={(event) => setIssueForm((prev) => ({ ...prev, notes: event.target.value }))}
                            placeholder="What needs to be fixed or improved?"
                            rows="3"
                            className="input min-h-[88px] resize-none py-3 text-sm"
                          />
                          <button type="submit" disabled={issueSaving} className="btn btn-primary py-3 text-xs">
                            {issueSaving ? 'Adding...' : 'Add Issue'}
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="grid gap-5">
                      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Releases</p>
                        <h4 className="mt-1 text-lg font-black text-white">Version plan and client changelog</h4>

                        <div className="mt-4 space-y-3">
                          {releases.length ? (
                            releases.map((release) => (
                              <div key={release._id || release.version} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black text-white">{release.version} - {release.title}</p>
                                    <p className="mt-1 text-xs font-medium text-zinc-500">{formatDate(release.targetDate)}</p>
                                  </div>
                                  <select
                                    value={release.status || 'planned'}
                                    onChange={(event) => updateRelease(release, { status: event.target.value })}
                                    disabled={!canEditActiveProject}
                                    className="input py-2 text-xs sm:w-36"
                                  >
                                    {releaseStatuses.map((status) => (
                                      <option key={status} value={status}>{statusLabel(status)}</option>
                                    ))}
                                  </select>
                                </div>
                                {release.summary && (
                                  <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-400">{release.summary}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                              <p className="text-sm font-black text-white">No releases yet</p>
                              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                                Plan versions so clients know what changed and what is shipping next.
                              </p>
                            </div>
                          )}
                        </div>

                        {canEditActiveProject && (
                          <form onSubmit={addRelease} className="mt-4 grid gap-3">
                            <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                              <input
                                value={releaseForm.version}
                                onChange={(event) => setReleaseForm((prev) => ({ ...prev, version: event.target.value }))}
                                placeholder="v1.1"
                                className="input py-3 text-sm"
                              />
                              <input
                                value={releaseForm.title}
                                onChange={(event) => setReleaseForm((prev) => ({ ...prev, title: event.target.value }))}
                                placeholder="Release title"
                                className="input py-3 text-sm"
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <select
                                value={releaseForm.status}
                                onChange={(event) => setReleaseForm((prev) => ({ ...prev, status: event.target.value }))}
                                className="input py-3 text-sm"
                              >
                                {releaseStatuses.map((status) => (
                                  <option key={status} value={status}>{statusLabel(status)}</option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={releaseForm.targetDate}
                                onChange={(event) => setReleaseForm((prev) => ({ ...prev, targetDate: event.target.value }))}
                                className="input py-3 text-sm"
                              />
                            </div>
                            <textarea
                              value={releaseForm.summary}
                              onChange={(event) => setReleaseForm((prev) => ({ ...prev, summary: event.target.value }))}
                              placeholder="What will change in this release?"
                              rows="3"
                              className="input min-h-[88px] resize-none py-3 text-sm"
                            />
                            <button type="submit" disabled={releaseSaving} className="btn btn-primary py-3 text-xs">
                              {releaseSaving ? 'Adding...' : 'Add Release'}
                            </button>
                          </form>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Project docs</p>
                        <h4 className="mt-1 text-lg font-black text-white">Setup, QA, and handover notes</h4>

                        <div className="mt-4 space-y-3">
                          {wikiPages.length ? (
                            wikiPages.slice(-4).map((page) => (
                              <div key={page._id || page.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-white">{page.title}</p>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                    {statusLabel(page.category || 'other')}
                                  </span>
                                </div>
                                <p className="mt-3 line-clamp-4 whitespace-pre-line text-xs font-medium leading-relaxed text-zinc-400">
                                  {page.content}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                              <p className="text-sm font-black text-white">No docs yet</p>
                              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                                Save setup steps, client rules, QA checklist, and handover notes.
                              </p>
                            </div>
                          )}
                        </div>

                        {canEditActiveProject && (
                          <form onSubmit={addWikiPage} className="mt-4 grid gap-3">
                            <input
                              value={wikiForm.title}
                              onChange={(event) => setWikiForm((prev) => ({ ...prev, title: event.target.value }))}
                              placeholder="Doc title"
                              className="input py-3 text-sm"
                            />
                            <select
                              value={wikiForm.category}
                              onChange={(event) => setWikiForm((prev) => ({ ...prev, category: event.target.value }))}
                              className="input py-3 text-sm"
                            >
                              {wikiCategories.map((category) => (
                                <option key={category} value={category}>{statusLabel(category)}</option>
                              ))}
                            </select>
                            <textarea
                              value={wikiForm.content}
                              onChange={(event) => setWikiForm((prev) => ({ ...prev, content: event.target.value }))}
                              placeholder="Write setup steps, QA checklist, client rule, or handover note"
                              rows="5"
                              className="input min-h-[120px] resize-none py-3 text-sm"
                            />
                            <button type="submit" disabled={wikiSaving} className="btn btn-primary py-3 text-xs">
                              {wikiSaving ? 'Saving...' : 'Save Doc'}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
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
