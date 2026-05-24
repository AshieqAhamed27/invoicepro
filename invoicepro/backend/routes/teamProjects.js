const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const TeamProject = require('../models/TeamProject');
const User = require('../models/User');
const { protect, requirePro, hasPaidPlan } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');
const { getJwtSecret } = require('../utils/env');
const { getCodeRunnerStatus, runCodeInDocker } = require('../utils/dockerSandbox');
const {
    encryptGitHubToken,
    fetchGitHubRepos,
    fetchGitHubRepoSnapshot,
    fetchGitHubViewer,
    getUserGitHubToken,
    parseGitHubRepo
} = require('../utils/githubIntegration');

const router = express.Router();

const TEAM_PROJECT_STATUSES = ['planning', 'active', 'review', 'completed', 'paused'];
const TASK_STATUSES = ['todo', 'doing', 'done', 'blocked'];
const PRIORITIES = ['low', 'normal', 'high'];
const AVAILABILITY = ['low', 'medium', 'high'];
const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];
const RESOURCE_TYPES = ['repository', 'preview', 'design', 'document', 'other'];
const ISSUE_TYPES = ['bug', 'feature', 'task', 'client_request'];
const ISSUE_STATUSES = ['open', 'in_progress', 'review', 'done'];
const RELEASE_STATUSES = ['planned', 'in_progress', 'shipped'];
const WIKI_CATEGORIES = ['setup', 'client', 'delivery', 'qa', 'handover', 'other'];
const CODE_OS_OPTIONS = ['linux', 'windows', 'macos', 'android', 'ios', 'server', 'other'];
const CODE_SNIPPET_STATUSES = ['draft', 'review', 'approved'];
const MEMBER_ROLES = ['owner', 'manager', 'delivery', 'finance', 'editor', 'viewer', 'client_viewer'];
const INVITE_ROLES = ['manager', 'delivery', 'finance', 'editor', 'viewer', 'client_viewer'];
const MAX_AUDIT_LOGS = 150;
const ROLE_DEFINITIONS = {
    owner: {
        label: 'Owner',
        description: 'Full control over project, members, delivery, finance, audit logs, and deletion.',
        permissions: {
            view: true,
            editProject: true,
            manageDelivery: true,
            manageFinance: true,
            manageCode: true,
            createInvites: true,
            updateMembers: true,
            viewAudit: true,
            runAgents: true,
            deleteProject: true,
            chat: true
        }
    },
    manager: {
        label: 'Manager',
        description: 'Controls delivery workflow, client progress, team invites, and audit review without deleting the project.',
        permissions: {
            view: true,
            editProject: true,
            manageDelivery: true,
            manageFinance: true,
            manageCode: true,
            createInvites: true,
            updateMembers: false,
            viewAudit: true,
            runAgents: true,
            deleteProject: false,
            chat: true
        }
    },
    delivery: {
        label: 'Delivery',
        description: 'Updates delivery tasks, proof links, docs, issues, releases, and technical handover.',
        permissions: {
            view: true,
            editProject: true,
            manageDelivery: true,
            manageFinance: false,
            manageCode: true,
            createInvites: false,
            updateMembers: false,
            viewAudit: false,
            runAgents: true,
            deleteProject: false,
            chat: true
        }
    },
    finance: {
        label: 'Finance',
        description: 'Views project context and handles invoice/payment follow-up without changing delivery work.',
        permissions: {
            view: true,
            editProject: false,
            manageDelivery: false,
            manageFinance: true,
            manageCode: false,
            createInvites: false,
            updateMembers: false,
            viewAudit: true,
            runAgents: false,
            deleteProject: false,
            chat: true
        }
    },
    editor: {
        label: 'Editor',
        description: 'Legacy editor access for users who can update workroom content.',
        permissions: {
            view: true,
            editProject: true,
            manageDelivery: true,
            manageFinance: true,
            manageCode: true,
            createInvites: false,
            updateMembers: false,
            viewAudit: false,
            runAgents: true,
            deleteProject: false,
            chat: true
        }
    },
    viewer: {
        label: 'Viewer',
        description: 'Can view project status and send simple updates.',
        permissions: {
            view: true,
            editProject: false,
            manageDelivery: false,
            manageFinance: false,
            manageCode: false,
            createInvites: false,
            updateMembers: false,
            viewAudit: false,
            runAgents: false,
            deleteProject: false,
            chat: true
        }
    },
    client_viewer: {
        label: 'Client Viewer',
        description: 'Client-safe view for reviewing project status and payment context.',
        permissions: {
            view: true,
            editProject: false,
            manageDelivery: false,
            manageFinance: false,
            manageCode: false,
            createInvites: false,
            updateMembers: false,
            viewAudit: false,
            runAgents: false,
            deleteProject: false,
            chat: true
        }
    }
};
const projectEventClients = new Map();

const cleanString = (value) => String(value || '').trim();

const normalizeEmail = (value) => cleanString(value).toLowerCase();

const getRoleDefinition = (role) => ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.viewer;

const getRolePermissions = (role) => ({
    ...ROLE_DEFINITIONS.viewer.permissions,
    ...getRoleDefinition(role).permissions
});

const hasPermission = (role, permission) => Boolean(getRolePermissions(role)[permission]);

const canEditProject = (role) => hasPermission(role, 'editProject');

const canManageDelivery = (role) => hasPermission(role, 'manageDelivery');

const canManageFinance = (role) => hasPermission(role, 'manageFinance');

const canManageCode = (role) => hasPermission(role, 'manageCode');

const canCreateInvites = (role) => hasPermission(role, 'createInvites');

const canViewAudit = (role) => hasPermission(role, 'viewAudit');

const canRunAgents = (role) => hasPermission(role, 'runAgents');

const getRoleOptions = () => INVITE_ROLES.map((role) => ({
    role,
    label: getRoleDefinition(role).label,
    description: getRoleDefinition(role).description,
    permissions: getRolePermissions(role)
}));

const serializeAuditLogs = (logs = []) =>
    (Array.isArray(logs) ? logs : [])
        .slice(-80)
        .reverse()
        .map((log) => ({
            id: log._id,
            action: log.action,
            label: log.label,
            targetType: log.targetType,
            targetId: log.targetId,
            actor: log.actor || {},
            details: log.details || {},
            createdAt: log.createdAt
        }));

const getActorSnapshot = (user, role) => ({
    user: user?._id || null,
    name: cleanString(user?.name) || cleanString(user?.email) || 'Team member',
    email: normalizeEmail(user?.email),
    role: role || ''
});

const addAuditLog = (project, user, role, entry = {}) => {
    if (!project) return null;
    if (!Array.isArray(project.auditLogs)) {
        project.auditLogs = [];
    }

    const log = {
        action: cleanString(entry.action).slice(0, 80) || 'project.updated',
        label: cleanString(entry.label).slice(0, 160),
        targetType: cleanString(entry.targetType).slice(0, 60),
        targetId: cleanString(entry.targetId).slice(0, 80),
        actor: getActorSnapshot(user, role),
        details: entry.details && typeof entry.details === 'object' ? entry.details : {},
        createdAt: new Date()
    };

    project.auditLogs.push(log);
    if (project.auditLogs.length > MAX_AUDIT_LOGS) {
        project.auditLogs = project.auditLogs.slice(-MAX_AUDIT_LOGS);
    }

    return log;
};

const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    return cleanString(req.query.token);
};

const getUserFromEventRequest = async(req) => {
    const token = getTokenFromRequest(req);
    if (!token) return null;

    const decoded = jwt.verify(token, getJwtSecret());
    return User.findById(decoded.id).select('-password');
};

const sendProjectEvent = (res, event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcastProjectEvent = (projectId, event, payload) => {
    const clients = projectEventClients.get(String(projectId));
    if (!clients?.size) return;

    for (const [res] of clients) {
        try {
            sendProjectEvent(res, event, payload);
        } catch {
            clients.delete(res);
        }
    }

    if (!clients.size) {
        projectEventClients.delete(String(projectId));
    }
};

const closeProjectUserStreams = (projectId, userId, event, payload) => {
    const clients = projectEventClients.get(String(projectId));
    if (!clients?.size || !userId) return;

    for (const [res, clientUserId] of clients) {
        if (String(clientUserId) !== String(userId)) continue;

        try {
            if (event) sendProjectEvent(res, event, payload);
            res.end();
        } catch {
            // Stream is already gone.
        }

        clients.delete(res);
    }

    if (!clients.size) {
        projectEventClients.delete(String(projectId));
    }
};

const createInviteToken = () => crypto.randomBytes(32).toString('hex');

const hashInviteToken = (token) =>
    crypto.createHash('sha256').update(String(token || '')).digest('hex');

const getFrontendUrl = (req) => {
    const origin = req.get('origin');
    if (origin) return String(origin).replace(/\/+$/, '');

    const configured = cleanString(process.env.FRONTEND_URL).replace(/\/+$/, '');
    if (configured) return configured;

    return `${req.protocol}://${req.get('host')}`;
};

const getInviteUrl = (req, token) => `${getFrontendUrl(req)}/team-invite/${token}`;

const getMemberRole = (project, userId) => {
    if (!project || !userId) return null;
    if (String(project.user) === String(userId)) return 'owner';

    const member = (project.members || []).find((item) =>
        item.status === 'active' && item.user && String(item.user) === String(userId)
    );

    return member?.role || null;
};

const serializeProjectForUser = (project, user) => {
    const plain = typeof project.toObject === 'function' ? project.toObject() : project;
    const accessRole = getMemberRole(plain, user?._id);
    const permissions = getRolePermissions(accessRole);
    const inviteTokens = plain.inviteTokens || [];
    const members = [...(plain.members || [])];
    const activeInvites = inviteTokens.filter((invite) =>
        !invite.revokedAt && !invite.acceptedAt && new Date(invite.expiresAt) > new Date()
    );

    if (accessRole === 'owner' && !members.some((member) => member.user && String(member.user) === String(user?._id))) {
        members.unshift({
            user: user?._id,
            name: user?.name || 'Project owner',
            email: user?.email || '',
            role: 'owner',
            groupName: '',
            status: 'active',
            joinedAt: plain.createdAt
        });
    }

    return {
        ...plain,
        members,
        inviteTokens: undefined,
        accessRole,
        accessLabel: getRoleDefinition(accessRole).label,
        permissions,
        canEdit: canEditProject(accessRole),
        canInvite: canCreateInvites(accessRole) && hasPaidPlan(user),
        roleOptions: accessRole === 'owner' || accessRole === 'manager' ? getRoleOptions() : [],
        auditLogs: canViewAudit(accessRole) ? serializeAuditLogs(plain.auditLogs) : [],
        activeInvites: activeInvites.map((invite) => ({
            id: invite._id,
            email: invite.email,
            role: invite.role,
            roleLabel: getRoleDefinition(invite.role).label,
            groupName: invite.groupName,
            expiresAt: invite.expiresAt
        }))
    };
};

const serializeProjectsForUser = (projects, user) =>
    projects.map((project) => serializeProjectForUser(project, user));

const serializeGitHubStatus = (user) => ({
    connected: Boolean(user?.github?.connected),
    username: user?.github?.username || '',
    name: user?.github?.name || '',
    avatarUrl: user?.github?.avatarUrl || '',
    htmlUrl: user?.github?.htmlUrl || '',
    connectedAt: user?.github?.connectedAt || null,
    lastVerifiedAt: user?.github?.lastVerifiedAt || null
});

const getProjectCollabSnapshot = (project) => {
    const plain = typeof project.toObject === 'function' ? project.toObject() : project;

    return {
        projectId: String(plain._id),
        status: plain.status,
        tasks: plain.tasks || [],
        resources: plain.resources || [],
        maintenanceIssues: plain.maintenanceIssues || [],
        releases: plain.releases || [],
        wikiPages: plain.wikiPages || [],
        githubRepo: plain.githubRepo || {},
        codeEnvironments: plain.codeEnvironments || [],
        codeSnippets: plain.codeSnippets || [],
        codeRuns: plain.codeRuns || [],
        aiPlan: plain.aiPlan || {},
        developerAgent: plain.developerAgent || {},
        maintenanceAgent: plain.maintenanceAgent || {},
        updatedAt: plain.updatedAt
    };
};

const normalizeNumber = (value) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (date) => {
    if (!date) return 'not set';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getDaysUntil = (value) => {
    if (!value) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(value);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const normalizeGroups = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            name: cleanString(item.name),
            focus: cleanString(item.focus),
            lead: cleanString(item.lead),
            status: TEAM_PROJECT_STATUSES.includes(item.status) ? item.status : 'planning'
        }))
        .filter((item) => item.name);

const normalizeCollaborators = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            name: cleanString(item.name),
            email: cleanString(item.email).toLowerCase(),
            role: cleanString(item.role) || 'Contributor',
            skill: cleanString(item.skill),
            groupName: cleanString(item.groupName),
            availability: AVAILABILITY.includes(item.availability) ? item.availability : 'medium',
            rate: normalizeNumber(item.rate),
            status: ['invited', 'active', 'paused'].includes(item.status) ? item.status : 'invited'
        }))
        .filter((item) => item.name);

const normalizeTasks = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            title: cleanString(item.title),
            owner: cleanString(item.owner),
            groupName: cleanString(item.groupName),
            priority: PRIORITIES.includes(item.priority) ? item.priority : 'normal',
            status: TASK_STATUSES.includes(item.status) ? item.status : 'todo',
            dueDate: normalizeDate(item.dueDate),
            notes: cleanString(item.notes)
        }))
        .filter((item) => item.title);

const normalizeResources = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            label: cleanString(item.label),
            type: RESOURCE_TYPES.includes(item.type) ? item.type : 'other',
            url: cleanString(item.url),
            notes: cleanString(item.notes),
            addedBy: cleanString(item.addedBy)
        }))
        .filter((item) => item.label && /^https?:\/\//i.test(item.url));

const normalizeMaintenanceIssues = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            title: cleanString(item.title),
            type: ISSUE_TYPES.includes(item.type) ? item.type : 'task',
            status: ISSUE_STATUSES.includes(item.status) ? item.status : 'open',
            priority: PRIORITIES.includes(item.priority) ? item.priority : 'normal',
            owner: cleanString(item.owner),
            groupName: cleanString(item.groupName),
            dueDate: normalizeDate(item.dueDate),
            notes: cleanString(item.notes),
            createdBy: cleanString(item.createdBy)
        }))
        .filter((item) => item.title);

const normalizeReleases = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            version: cleanString(item.version),
            title: cleanString(item.title),
            status: RELEASE_STATUSES.includes(item.status) ? item.status : 'planned',
            targetDate: normalizeDate(item.targetDate),
            summary: cleanString(item.summary),
            createdBy: cleanString(item.createdBy)
        }))
        .filter((item) => item.version && item.title);

const normalizeWikiPages = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            title: cleanString(item.title),
            category: WIKI_CATEGORIES.includes(item.category) ? item.category : 'other',
            content: String(item.content || '').trim().slice(0, 8000),
            updatedBy: cleanString(item.updatedBy)
        }))
        .filter((item) => item.title && item.content);

const normalizeCommandList = (value) => {
    if (Array.isArray(value)) {
        return value.map(cleanString).filter(Boolean).slice(0, 20);
    }

    return String(value || '')
        .split(/\r?\n/)
        .map(cleanString)
        .filter(Boolean)
        .slice(0, 20);
};

const normalizeCodeEnvironments = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            name: cleanString(item.name),
            os: CODE_OS_OPTIONS.includes(item.os) ? item.os : 'linux',
            runtime: cleanString(item.runtime),
            repositoryUrl: cleanString(item.repositoryUrl),
            branch: cleanString(item.branch),
            setupCommands: normalizeCommandList(item.setupCommands),
            runCommands: normalizeCommandList(item.runCommands),
            testCommands: normalizeCommandList(item.testCommands),
            notes: cleanString(item.notes),
            owner: cleanString(item.owner),
            groupName: cleanString(item.groupName)
        }))
        .filter((item) => item.name);

const normalizeCodeSnippets = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => ({
            title: cleanString(item.title),
            filePath: cleanString(item.filePath),
            language: cleanString(item.language) || 'text',
            code: String(item.code || '').trim().slice(0, 12000),
            notes: cleanString(item.notes),
            owner: cleanString(item.owner),
            groupName: cleanString(item.groupName),
            status: CODE_SNIPPET_STATUSES.includes(item.status) ? item.status : 'draft'
        }))
        .filter((item) => item.title && item.code);

const normalizeProjectPayload = (body = {}) => ({
    title: cleanString(body.title),
    clientName: cleanString(body.clientName),
    budget: normalizeNumber(body.budget),
    currency: CURRENCIES.includes(body.currency) ? body.currency : 'INR',
    deadline: normalizeDate(body.deadline),
    status: TEAM_PROJECT_STATUSES.includes(body.status) ? body.status : 'planning',
    projectBrief: cleanString(body.projectBrief),
    groups: normalizeGroups(body.groups),
    collaborators: normalizeCollaborators(body.collaborators),
    tasks: normalizeTasks(body.tasks),
    resources: normalizeResources(body.resources),
    maintenanceIssues: normalizeMaintenanceIssues(body.maintenanceIssues),
    releases: normalizeReleases(body.releases),
    wikiPages: normalizeWikiPages(body.wikiPages),
    codeEnvironments: normalizeCodeEnvironments(body.codeEnvironments),
    codeSnippets: normalizeCodeSnippets(body.codeSnippets)
});

const normalizeProjectUpdates = (body = {}) => {
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, 'title')) updates.title = cleanString(body.title);
    if (Object.prototype.hasOwnProperty.call(body, 'clientName')) updates.clientName = cleanString(body.clientName);
    if (Object.prototype.hasOwnProperty.call(body, 'budget')) updates.budget = normalizeNumber(body.budget);
    if (Object.prototype.hasOwnProperty.call(body, 'currency')) updates.currency = CURRENCIES.includes(body.currency) ? body.currency : 'INR';
    if (Object.prototype.hasOwnProperty.call(body, 'deadline')) updates.deadline = normalizeDate(body.deadline);
    if (Object.prototype.hasOwnProperty.call(body, 'status')) updates.status = TEAM_PROJECT_STATUSES.includes(body.status) ? body.status : 'planning';
    if (Object.prototype.hasOwnProperty.call(body, 'projectBrief')) updates.projectBrief = cleanString(body.projectBrief);
    if (Object.prototype.hasOwnProperty.call(body, 'groups')) updates.groups = normalizeGroups(body.groups);
    if (Object.prototype.hasOwnProperty.call(body, 'collaborators')) updates.collaborators = normalizeCollaborators(body.collaborators);
    if (Object.prototype.hasOwnProperty.call(body, 'tasks')) updates.tasks = normalizeTasks(body.tasks);
    if (Object.prototype.hasOwnProperty.call(body, 'resources')) updates.resources = normalizeResources(body.resources);
    if (Object.prototype.hasOwnProperty.call(body, 'maintenanceIssues')) updates.maintenanceIssues = normalizeMaintenanceIssues(body.maintenanceIssues);
    if (Object.prototype.hasOwnProperty.call(body, 'releases')) updates.releases = normalizeReleases(body.releases);
    if (Object.prototype.hasOwnProperty.call(body, 'wikiPages')) updates.wikiPages = normalizeWikiPages(body.wikiPages);
    if (Object.prototype.hasOwnProperty.call(body, 'codeEnvironments')) updates.codeEnvironments = normalizeCodeEnvironments(body.codeEnvironments);
    if (Object.prototype.hasOwnProperty.call(body, 'codeSnippets')) updates.codeSnippets = normalizeCodeSnippets(body.codeSnippets);

    return updates;
};

const getDefaultMilestones = (project = {}) => {
    const collaborators = project.collaborators || [];
    const owner = collaborators[0]?.name || 'Project owner';
    const deliveryOwner = collaborators[1]?.name || owner;

    return [
        { title: 'Confirm scope and acceptance criteria', owner, dueHint: 'Today' },
        { title: 'Split work into delivery tasks', owner: deliveryOwner, dueHint: 'Next 24 hours' },
        { title: 'Review progress and client blockers', owner, dueHint: 'Mid-project' },
        { title: 'Prepare final handover and invoice', owner, dueHint: 'Before deadline' }
    ];
};

const buildTeamAiPlan = (project = {}) => {
    const groups = project.groups || [];
    const collaborators = project.collaborators || [];
    const tasks = project.tasks || [];
    const activeTasks = tasks.filter((task) => task.status !== 'done');
    const blockedTasks = tasks.filter((task) => task.status === 'blocked');
    const highPriorityTasks = activeTasks.filter((task) => task.priority === 'high');
    const daysUntilDeadline = getDaysUntil(project.deadline);
    const risks = [];

    if (!collaborators.length) risks.push('Add at least one collaborator so responsibility is not stuck with one person.');
    if (!tasks.length) risks.push('Add delivery tasks so the team knows what to finish first.');
    if (collaborators.length >= 3 && !groups.length) risks.push('Create groups so a larger freelancer team has clear ownership.');
    if (!project.deadline) risks.push('Set a deadline so AI can sequence work and review dates.');
    if (daysUntilDeadline !== null && daysUntilDeadline < 0) risks.push('Deadline is already overdue. Move the project to recovery mode.');
    if (daysUntilDeadline !== null && daysUntilDeadline <= 3 && activeTasks.length) risks.push('Deadline is close while tasks are still open.');
    if (blockedTasks.length) risks.push(`${blockedTasks.length} task${blockedTasks.length === 1 ? '' : 's'} blocked and needs owner attention.`);

    const riskLevel = blockedTasks.length || (daysUntilDeadline !== null && daysUntilDeadline <= 3 && activeTasks.length)
        ? 'high'
        : risks.length >= 2
            ? 'medium'
            : 'low';

    const roleSplit = collaborators.map((person, index) => {
        const ownedTasks = tasks.filter((task) => task.owner === person.name);
        const focusTask = ownedTasks.find((task) => task.status !== 'done') || activeTasks[index] || tasks[index];

        return {
            name: person.name,
            role: person.role || 'Contributor',
            focus: `${person.groupName ? `${person.groupName}: ` : ''}${focusTask?.title || person.skill || 'Support project delivery and daily progress updates'}`
        };
    });

    const groupPlan = (groups.length ? groups : [{
        name: 'Core Team',
        focus: project.projectBrief || 'Project delivery',
        lead: collaborators[0]?.name || '',
        status: project.status || 'planning'
    }]).map((group) => {
        const groupCollaborators = collaborators.filter((person) => person.groupName === group.name);
        const groupTasks = tasks.filter((task) => task.groupName === group.name);
        const openGroupTasks = groupTasks.filter((task) => task.status !== 'done');
        const blockedGroupTasks = groupTasks.filter((task) => task.status === 'blocked');
        const nextGroupTask = blockedGroupTasks[0] || openGroupTasks.find((task) => task.priority === 'high') || openGroupTasks[0];

        return {
            name: group.name,
            focus: group.focus || groupTasks[0]?.title || 'Project delivery',
            nextAction: nextGroupTask
                ? `${nextGroupTask.owner || group.lead || group.name} should move "${nextGroupTask.title}" forward.`
                : groupCollaborators.length
                    ? `${group.lead || groupCollaborators[0].name} should confirm the next deliverable for ${group.name}.`
                    : `Add members or tasks to ${group.name}.`,
            risk: blockedGroupTasks.length
                ? 'high'
                : !groupCollaborators.length || !groupTasks.length
                    ? 'medium'
                    : 'low'
        };
    });

    const milestonePlan = tasks.length
        ? tasks.slice(0, 6).map((task) => ({
            title: task.groupName ? `${task.groupName}: ${task.title}` : task.title,
            owner: task.owner || collaborators[0]?.name || 'Unassigned',
            dueHint: task.dueDate ? formatDate(task.dueDate) : task.priority === 'high' ? 'Do first' : 'Schedule next'
        }))
        : getDefaultMilestones(project);

    const nextTask = highPriorityTasks[0] || blockedTasks[0] || activeTasks[0];
    const nextAction = nextTask
        ? `${nextTask.owner || 'Assign an owner'} should move "${nextTask.title}" forward today.`
        : collaborators.length
            ? 'Run a short team review, confirm handover quality, then prepare the final invoice.'
            : 'Add the first collaborator and assign delivery ownership.';

    const summary = `${project.title || 'This project'} has ${groups.length} group${groups.length === 1 ? '' : 's'}, ${collaborators.length} collaborator${collaborators.length === 1 ? '' : 's'}, ${tasks.length} task${tasks.length === 1 ? '' : 's'}, and deadline ${formatDate(project.deadline)}.`;

    return {
        summary,
        nextAction,
        riskLevel,
        roleSplit,
        milestonePlan,
        groupPlan,
        risks: risks.length ? risks : ['No major delivery risk detected right now. Keep daily updates visible.'],
        generatedAt: new Date()
    };
};

const buildDeveloperAgentPlan = (project = {}) => {
    const tasks = project.tasks || [];
    const resources = project.resources || [];
    const codeEnvironments = project.codeEnvironments || [];
    const codeSnippets = project.codeSnippets || [];
    const openTasks = tasks.filter((task) => task.status !== 'done');
    const blockedTasks = tasks.filter((task) => task.status === 'blocked');
    const repository = resources.find((item) => item.type === 'repository');
    const preview = resources.find((item) => item.type === 'preview');
    const design = resources.find((item) => item.type === 'design');
    const linuxEnv = codeEnvironments.find((item) => item.os === 'linux' || item.os === 'server');
    const nextTask = blockedTasks[0] || openTasks.find((task) => task.priority === 'high') || openTasks[0];

    const nextSteps = [
        repository ? 'Pull the latest code and confirm the main branch before starting work.' : 'Add the GitHub/GitLab repository link so every collaborator can inspect the code.',
        linuxEnv ? `Use the ${linuxEnv.name} ${linuxEnv.os} environment for server/Linux work.` : 'Add at least one Linux/server environment if the project needs deployment, CLI, or backend work.',
        design ? 'Compare the current output with the design/reference link before marking UI tasks done.' : 'Add a design, requirement, or reference link if the UI needs visual approval.',
        preview ? 'Open the live preview and verify the latest output on desktop and mobile.' : 'Add a live preview/deployment link so the team can test output without asking for screenshots.',
        nextTask
            ? `${nextTask.owner || 'Assigned developer'} should work on "${nextTask.title}" next.`
            : 'Create the next development task before the team starts work.'
    ];

    return {
        summary: `${project.title || 'This project'} has ${resources.length} shared build link${resources.length === 1 ? '' : 's'}, ${codeEnvironments.length} technical environment${codeEnvironments.length === 1 ? '' : 's'}, ${codeSnippets.length} saved note${codeSnippets.length === 1 ? '' : 's'}, and ${openTasks.length} open development task${openTasks.length === 1 ? '' : 's'}.`,
        nextSteps,
        codeChecklist: [
            'Confirm the task owner before changing shared files.',
            'Test the affected page or API before marking the task done.',
            'Share the preview/output link in the project room after every major update.',
            'Write a short chat update explaining what changed and what still needs review.'
        ],
        outputChecklist: [
            'Check mobile layout first because most freelancers open from phone.',
            'Verify buttons, forms, and links work on the live preview.',
            'Compare output with client requirements before final handoff.',
            'Move completed work to review before invoicing the client.'
        ],
        blockers: blockedTasks.length
            ? blockedTasks.map((task) => `${task.title} is blocked${task.owner ? ` for ${task.owner}` : ''}.`)
            : ['No blocked development tasks detected.'],
        generatedAt: new Date()
    };
};

const buildMaintenanceAgentPlan = (project = {}) => {
    const issues = project.maintenanceIssues || [];
    const releases = project.releases || [];
    const wikiPages = project.wikiPages || [];
    const openIssues = issues.filter((issue) => issue.status !== 'done');
    const highPriorityIssues = openIssues.filter((issue) => issue.priority === 'high');
    const reviewIssues = openIssues.filter((issue) => issue.status === 'review');
    const plannedRelease = releases.find((release) => release.status !== 'shipped');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueIssues = openIssues.filter((issue) => {
        if (!issue.dueDate) return false;
        const dueDate = new Date(issue.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    });

    let healthScore = 88;
    healthScore -= Math.min(openIssues.length * 5, 30);
    healthScore -= Math.min(highPriorityIssues.length * 10, 30);
    healthScore -= Math.min(overdueIssues.length * 12, 36);
    healthScore += Math.min(wikiPages.length * 4, 12);
    healthScore = Math.max(15, Math.min(100, healthScore));

    const nextIssue = overdueIssues[0] || highPriorityIssues[0] || reviewIssues[0] || openIssues[0];
    const nextAction = nextIssue
        ? `${nextIssue.owner || 'Assign an owner'} should move "${nextIssue.title}" to the next status.`
        : plannedRelease
            ? `Prepare ${plannedRelease.version} - ${plannedRelease.title} for release.`
            : 'Create the next improvement issue or release plan so the project keeps moving.';

    const riskNotes = [
        overdueIssues.length ? `${overdueIssues.length} issue${overdueIssues.length === 1 ? '' : 's'} are overdue.` : '',
        highPriorityIssues.length ? `${highPriorityIssues.length} high priority issue${highPriorityIssues.length === 1 ? '' : 's'} need attention.` : '',
        !wikiPages.length ? 'Add setup, QA, and handover notes so future freelancers can maintain this project.' : '',
        !releases.length ? 'Create release notes so clients can see what changed over time.' : ''
    ].filter(Boolean);

    return {
        summary: `${project.title || 'This project'} has ${openIssues.length} open issue${openIssues.length === 1 ? '' : 's'}, ${releases.length} release plan${releases.length === 1 ? '' : 's'}, and ${wikiPages.length} project doc${wikiPages.length === 1 ? '' : 's'}.`,
        healthScore,
        nextAction,
        releaseChecklist: [
            'Confirm all high priority issues are done or moved out of this release.',
            'Test the live preview on desktop and mobile before shipping.',
            'Write a short release note explaining what changed for the client.',
            'Add any setup or handover lesson into project docs.',
            'Move the project to review before creating the final invoice.'
        ],
        riskNotes: riskNotes.length ? riskNotes : ['No major maintenance risk detected. Keep issues, release notes, and docs updated.'],
        generatedAt: new Date()
    };
};

const buildSummary = (projects = []) => ({
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
    openTasks: projects.reduce(
        (sum, project) => sum + (project.tasks || []).filter((task) => task.status !== 'done').length,
        0
    )
});

router.get('/', protect, async(req, res) => {
    try {
        const projects = await TeamProject.find({
            $or: [
                { user: req.user._id },
                { members: { $elemMatch: { user: req.user._id, status: 'active' } } }
            ]
        })
            .sort({ updatedAt: -1 })
            .lean();
        const visibleProjects = serializeProjectsForUser(projects, req.user);

        res.json({
            projects: visibleProjects,
            summary: buildSummary(visibleProjects),
            canCreateProjects: hasPaidPlan(req.user)
        });
    } catch (err) {
        console.error('GET TEAM PROJECTS ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.get('/code-runner/status', protect, async(req, res) => {
    res.json({ runner: getCodeRunnerStatus() });
});

router.get('/github/status', protect, async(req, res) => {
    res.json({ github: serializeGitHubStatus(req.user) });
});

router.post('/github/connect', protect, requirePro, async(req, res) => {
    try {
        const token = cleanString(req.body.token);
        if (!token || token.length < 20) {
            return res.status(400).json({ message: 'Paste a valid GitHub fine-grained token.' });
        }

        const viewer = await fetchGitHubViewer(token);
        const encrypted = encryptGitHubToken(token);

        req.user.github = {
            connected: true,
            username: viewer.username,
            name: viewer.name,
            avatarUrl: viewer.avatarUrl,
            htmlUrl: viewer.htmlUrl,
            ...encrypted,
            connectedAt: new Date(),
            lastVerifiedAt: new Date()
        };

        await req.user.save();

        res.json({
            message: 'GitHub connected.',
            github: serializeGitHubStatus(req.user)
        });
    } catch (err) {
        console.error('GITHUB CONNECT ERROR:', err);
        const status = err.status === 401 || err.status === 403 ? 400 : 500;
        res.status(status).json({
            message: status === 400
                ? 'GitHub token could not be verified. Check token permissions and expiry.'
                : 'GitHub connection failed.'
        });
    }
});

router.delete('/github/connect', protect, async(req, res) => {
    req.user.github = {
        connected: false,
        username: '',
        name: '',
        avatarUrl: '',
        htmlUrl: '',
        tokenEncrypted: '',
        tokenIv: '',
        tokenAuthTag: '',
        connectedAt: null,
        lastVerifiedAt: null
    };

    await req.user.save();
    res.json({ message: 'GitHub disconnected.', github: serializeGitHubStatus(req.user) });
});

router.get('/github/repos', protect, async(req, res) => {
    try {
        const token = getUserGitHubToken(req.user);
        if (!token || !req.user.github?.connected) {
            return res.status(400).json({ message: 'Connect GitHub first.' });
        }

        const repos = await fetchGitHubRepos(token);
        req.user.github.lastVerifiedAt = new Date();
        await req.user.save();

        res.json({ repos, github: serializeGitHubStatus(req.user) });
    } catch (err) {
        console.error('GITHUB REPOS ERROR:', err);
        res.status(err.status === 401 || err.status === 403 ? 400 : 500).json({
            message: 'Could not load GitHub repositories. Check token permissions.'
        });
    }
});

router.post('/:id/github/link', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageCode(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can link GitHub repositories.' });
        }

        const token = getUserGitHubToken(req.user);
        if (!token || !req.user.github?.connected) {
            return res.status(400).json({ message: 'Connect GitHub first.' });
        }

        const parsed = parseGitHubRepo(req.body.repo || req.body.repoUrl || req.body.fullName);
        if (!parsed) {
            return res.status(400).json({ message: 'Use a valid GitHub repository URL or owner/repo name.' });
        }

        const snapshot = await fetchGitHubRepoSnapshot(token, parsed.owner, parsed.name);
        const repo = snapshot.repo || parsed;

        project.githubRepo = {
            owner: parsed.owner,
            name: parsed.name,
            fullName: parsed.fullName,
            htmlUrl: repo.htmlUrl || parsed.htmlUrl,
            defaultBranch: repo.defaultBranch || '',
            private: Boolean(repo.private),
            language: repo.language || '',
            linkedBy: req.user?.name || req.user?.email || 'Team member',
            linkedAt: new Date(),
            lastSyncedAt: new Date(),
            snapshot: {
                ...snapshot,
                syncedAt: new Date(snapshot.syncedAt || Date.now())
            }
        };

        if (!project.resources.some((resource) => resource.url === project.githubRepo.htmlUrl)) {
            project.resources.push({
                label: `${parsed.fullName} repository`,
                type: 'repository',
                url: project.githubRepo.htmlUrl,
                notes: 'Connected from GitHub integration.',
                addedBy: req.user?.name || req.user?.email || 'Team member'
            });
        }

        addAuditLog(project, req.user, accessRole, {
            action: 'github.linked',
            label: `Linked GitHub repository ${parsed.fullName}`,
            targetType: 'github',
            targetId: parsed.fullName,
            details: {
                private: Boolean(repo.private),
                language: repo.language || ''
            }
        });

        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            message: 'GitHub repository linked.',
            project: serializeProjectForUser(project, req.user),
            githubRepo: project.githubRepo
        });
    } catch (err) {
        console.error('GITHUB LINK ERROR:', err);
        res.status(err.status === 401 || err.status === 403 || err.status === 404 ? 400 : 500).json({
            message: 'Could not link this GitHub repository. Check repo access and token permissions.'
        });
    }
});

router.post('/:id/github/sync', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!accessRole) {
            return res.status(403).json({ message: 'You are not a member of this project.' });
        }

        if (!canManageCode(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can sync GitHub data.' });
        }

        if (!project.githubRepo?.owner || !project.githubRepo?.name) {
            return res.status(400).json({ message: 'Link a GitHub repository first.' });
        }

        const token = getUserGitHubToken(req.user);
        if (!token || !req.user.github?.connected) {
            return res.status(400).json({ message: 'Connect GitHub first.' });
        }

        const snapshot = await fetchGitHubRepoSnapshot(token, project.githubRepo.owner, project.githubRepo.name);
        project.githubRepo.snapshot = {
            ...snapshot,
            syncedAt: new Date(snapshot.syncedAt || Date.now())
        };
        project.githubRepo.lastSyncedAt = new Date();
        project.githubRepo.defaultBranch = snapshot.repo?.defaultBranch || project.githubRepo.defaultBranch;
        project.githubRepo.language = snapshot.repo?.language || project.githubRepo.language;
        project.githubRepo.private = Boolean(snapshot.repo?.private);

        addAuditLog(project, req.user, accessRole, {
            action: 'github.synced',
            label: `Synced GitHub repository ${project.githubRepo.fullName || `${project.githubRepo.owner}/${project.githubRepo.name}`}`,
            targetType: 'github',
            targetId: project.githubRepo.fullName || `${project.githubRepo.owner}/${project.githubRepo.name}`
        });

        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            message: 'GitHub repository synced.',
            project: serializeProjectForUser(project, req.user),
            githubRepo: project.githubRepo
        });
    } catch (err) {
        console.error('GITHUB SYNC ERROR:', err);
        res.status(err.status === 401 || err.status === 403 || err.status === 404 ? 400 : 500).json({
            message: 'Could not sync GitHub data. Check repo access and token permissions.'
        });
    }
});

router.get('/:id/events', async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const user = await getUserFromEventRequest(req);
        if (!user) {
            return res.status(401).json({ message: 'Not authorized. No token.' });
        }

        const project = await TeamProject.findById(req.params.id).lean();
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, user._id);
        if (!accessRole) {
            return res.status(403).json({ message: 'You are not a member of this project.' });
        }

        const projectId = String(project._id);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }

        if (!projectEventClients.has(projectId)) {
            projectEventClients.set(projectId, new Map());
        }

        projectEventClients.get(projectId).set(res, String(user._id));
        sendProjectEvent(res, 'connected', {
            projectId,
            connectedAt: new Date().toISOString()
        });

        const heartbeat = setInterval(() => {
            sendProjectEvent(res, 'ping', { at: new Date().toISOString() });
        }, 25000);

        req.on('close', () => {
            clearInterval(heartbeat);
            const clients = projectEventClients.get(projectId);
            if (clients) {
                clients.delete(res);
                if (!clients.size) projectEventClients.delete(projectId);
            }
        });
    } catch (err) {
        const isJwtError = ['JsonWebTokenError', 'TokenExpiredError'].includes(err?.name);
        if (isJwtError) {
            return res.status(401).json({
                message: err.name === 'TokenExpiredError'
                    ? 'Session expired. Please login again.'
                    : 'Token invalid. Please login again.'
            });
        }

        console.error('TEAM PROJECT EVENTS ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.get('/:id/audit-logs', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id).lean();
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canViewAudit(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, and finance members can view audit logs.' });
        }

        res.json({
            auditLogs: serializeAuditLogs(project.auditLogs),
            accessRole,
            permissions: getRolePermissions(accessRole)
        });
    } catch (err) {
        console.error('GET TEAM AUDIT LOGS ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/', protect, requirePro, async(req, res) => {
    try {
        const payload = normalizeProjectPayload(req.body);

        if (!payload.title) {
            return res.status(400).json({ message: 'Project title is required.' });
        }

        const aiPlan = buildTeamAiPlan(payload);
        const project = new TeamProject({
            ...payload,
            user: req.user._id,
            members: [{
                user: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: 'owner',
                status: 'active',
                joinedAt: new Date()
            }],
            aiPlan
        });

        addAuditLog(project, req.user, 'owner', {
            action: 'project.created',
            label: `Created workroom "${payload.title}"`,
            targetType: 'project',
            details: {
                clientName: payload.clientName,
                status: payload.status,
                currency: payload.currency
            }
        });

        await project.save();

        res.status(201).json({ project: serializeProjectForUser(project, req.user) });
    } catch (err) {
        console.error('CREATE TEAM PROJECT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.get('/invites/:token', async(req, res) => {
    try {
        const tokenHash = hashInviteToken(req.params.token);
        const project = await TeamProject.findOne({
            inviteTokens: {
                $elemMatch: {
                    tokenHash,
                    revokedAt: null,
                    acceptedAt: null,
                    expiresAt: { $gt: new Date() }
                }
            }
        })
            .populate('user', 'name email companyName')
            .lean();

        if (!project) {
            return res.status(404).json({ message: 'Invite link is invalid or expired.' });
        }

        const invite = (project.inviteTokens || []).find((item) =>
            item.tokenHash === tokenHash && !item.revokedAt && !item.acceptedAt && new Date(item.expiresAt) > new Date()
        );

        res.json({
            invite: {
                email: invite.email,
                role: invite.role,
                roleLabel: getRoleDefinition(invite.role).label,
                roleDescription: getRoleDefinition(invite.role).description,
                groupName: invite.groupName,
                expiresAt: invite.expiresAt
            },
            project: {
                title: project.title,
                clientName: project.clientName,
                deadline: project.deadline,
                groupNames: (project.groups || []).map((group) => group.name).filter(Boolean),
                ownerName: project.user?.companyName || project.user?.name || 'Project owner'
            }
        });
    } catch (err) {
        console.error('GET TEAM INVITE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/invites/:token/accept', protect, async(req, res) => {
    try {
        const tokenHash = hashInviteToken(req.params.token);
        const project = await TeamProject.findOne({
            inviteTokens: {
                $elemMatch: {
                    tokenHash,
                    revokedAt: null,
                    acceptedAt: null,
                    expiresAt: { $gt: new Date() }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ message: 'Invite link is invalid or expired.' });
        }

        const invite = project.inviteTokens.find((item) =>
            item.tokenHash === tokenHash && !item.revokedAt && !item.acceptedAt && new Date(item.expiresAt) > new Date()
        );

        if (!invite) {
            return res.status(404).json({ message: 'Invite link is invalid or expired.' });
        }

        if (invite.email && invite.email !== normalizeEmail(req.user.email)) {
            return res.status(403).json({
                message: `This invite was sent to ${invite.email}. Please login with that email.`
            });
        }

        const existingMember = project.members.find((member) =>
            member.user && String(member.user) === String(req.user._id)
        );

        if (existingMember) {
            existingMember.name = req.user.name || existingMember.name;
            existingMember.email = normalizeEmail(req.user.email);
            existingMember.role = MEMBER_ROLES.includes(existingMember.role) && existingMember.role === 'owner'
                ? 'owner'
                : invite.role;
            existingMember.groupName = invite.groupName || existingMember.groupName;
            existingMember.status = 'active';
            existingMember.joinedAt = existingMember.joinedAt || new Date();
        } else {
            project.members.push({
                user: req.user._id,
                name: req.user.name,
                email: normalizeEmail(req.user.email),
                role: invite.role,
                groupName: invite.groupName,
                status: 'active',
                joinedAt: new Date()
            });
        }

        invite.acceptedAt = new Date();
        invite.acceptedBy = req.user._id;

        project.messages.push({
            groupName: invite.groupName,
            senderName: 'ClientFlow AI',
            message: `${req.user.name || req.user.email} joined the project as ${invite.role}.`
        });

        addAuditLog(project, req.user, invite.role, {
            action: 'member.joined',
            label: `${req.user.name || req.user.email} accepted invite as ${getRoleDefinition(invite.role).label}`,
            targetType: 'member',
            targetId: String(req.user._id),
            details: {
                role: invite.role,
                groupName: invite.groupName
            }
        });

        await project.save();
        const joinedMessage = project.messages[project.messages.length - 1];
        broadcastProjectEvent(project._id, 'message', {
            projectId: String(project._id),
            message: joinedMessage,
            messageCount: project.messages.length
        });
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            message: 'Invite accepted.',
            project: serializeProjectForUser(project, req.user)
        });
    } catch (err) {
        console.error('ACCEPT TEAM INVITE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const payload = normalizeProjectUpdates(req.body);
        if (Object.prototype.hasOwnProperty.call(payload, 'title') && !payload.title) {
            return res.status(400).json({ message: 'Project title is required.' });
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canEditProject(accessRole)) {
            return res.status(403).json({ message: 'You only have viewer access for this project.' });
        }

        Object.assign(project, payload);
        addAuditLog(project, req.user, accessRole, {
            action: 'project.updated',
            label: 'Updated workroom details',
            targetType: 'project',
            targetId: String(project._id),
            details: {
                fields: Object.keys(payload)
            }
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({ project: serializeProjectForUser(project, req.user) });
    } catch (err) {
        console.error('UPDATE TEAM PROJECT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/invites', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canCreateInvites(accessRole)) {
            return res.status(403).json({ message: 'Only owners and managers can create invite links.' });
        }

        const email = normalizeEmail(req.body.email);
        const role = INVITE_ROLES.includes(req.body.role) ? req.body.role : 'viewer';
        const groupName = cleanString(req.body.groupName);
        const token = createInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        project.inviteTokens.push({
            tokenHash: hashInviteToken(token),
            email,
            role,
            groupName,
            createdBy: req.user._id,
            expiresAt
        });

        addAuditLog(project, req.user, accessRole, {
            action: 'invite.created',
            label: `Created ${getRoleDefinition(role).label} invite${email ? ` for ${email}` : ''}`,
            targetType: 'invite',
            details: {
                email,
                role,
                groupName,
                expiresAt
            }
        });

        await project.save();

        const inviteUrl = getInviteUrl(req, token);
        const shareText = [
            `You are invited to join "${project.title}" on ClientFlow AI.`,
            getRoleDefinition(role).description,
            groupName ? `Group: ${groupName}` : '',
            inviteUrl
        ].filter(Boolean).join('\n');

        res.status(201).json({
            invite: {
                email,
                role,
                groupName,
                expiresAt,
                inviteUrl,
                whatsappText: shareText,
                emailSubject: `Join ${project.title} on ClientFlow AI`,
                emailBody: shareText
            },
            project: serializeProjectForUser(project, req.user)
        });
    } catch (err) {
        console.error('CREATE TEAM INVITE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id/members/:memberId', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.memberId)) {
            return rejectInvalidObjectId(res, 'team member');
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!hasPermission(accessRole, 'updateMembers')) {
            return res.status(403).json({ message: 'Only the project owner can change member permissions.' });
        }

        const member = project.members.id(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: 'Team member not found.' });
        }

        if (member.role === 'owner') {
            return res.status(400).json({ message: 'Owner permission cannot be changed here.' });
        }

        const removingUserId = req.body.status === 'removed' ? member.user : null;
        const before = {
            role: member.role,
            groupName: member.groupName,
            status: member.status
        };

        if (Object.prototype.hasOwnProperty.call(req.body, 'role')) {
            member.role = INVITE_ROLES.includes(req.body.role) ? req.body.role : member.role;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'groupName')) {
            member.groupName = cleanString(req.body.groupName);
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
            member.status = ['active', 'removed'].includes(req.body.status) ? req.body.status : member.status;
        }

        addAuditLog(project, req.user, accessRole, {
            action: member.status === 'removed' ? 'member.removed' : 'member.updated',
            label: `${member.name || member.email || 'Team member'} permission updated`,
            targetType: 'member',
            targetId: String(member._id),
            details: {
                before,
                after: {
                    role: member.role,
                    groupName: member.groupName,
                    status: member.status
                }
            }
        });

        await project.save();
        if (removingUserId) {
            closeProjectUserStreams(project._id, removingUserId, 'access_removed', {
                projectId: String(project._id),
                message: 'Your access to this project was removed.'
            });
        }

        res.json({ project: serializeProjectForUser(project, req.user) });
    } catch (err) {
        console.error('UPDATE TEAM MEMBER ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/resources', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add proof links.' });
        }

        const resource = normalizeResources([{
            ...req.body,
            addedBy: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!resource) {
            return res.status(400).json({ message: 'Add a valid label and https:// link.' });
        }

        project.resources.push(resource);
        addAuditLog(project, req.user, accessRole, {
            action: 'resource.created',
            label: `Added proof link "${resource.label}"`,
            targetType: 'resource',
            details: {
                type: resource.type
            }
        });
        await project.save();
        const savedResource = project.resources[project.resources.length - 1];
        broadcastProjectEvent(project._id, 'resource', {
            projectId: String(project._id),
            resource: savedResource
        });

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            resource: savedResource
        });
    } catch (err) {
        console.error('CREATE TEAM RESOURCE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/issues', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add issues.' });
        }

        const issue = normalizeMaintenanceIssues([{
            ...req.body,
            createdBy: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!issue) {
            return res.status(400).json({ message: 'Issue title is required.' });
        }

        project.maintenanceIssues.push(issue);
        addAuditLog(project, req.user, accessRole, {
            action: 'issue.created',
            label: `Added issue "${issue.title}"`,
            targetType: 'issue',
            details: {
                priority: issue.priority,
                status: issue.status,
                type: issue.type
            }
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            issue: project.maintenanceIssues[project.maintenanceIssues.length - 1]
        });
    } catch (err) {
        console.error('CREATE TEAM ISSUE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id/issues/:issueId', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.issueId)) {
            return rejectInvalidObjectId(res, 'team issue');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can update issues.' });
        }

        const issue = project.maintenanceIssues.id(req.params.issueId);
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found.' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'title')) issue.title = cleanString(req.body.title) || issue.title;
        if (Object.prototype.hasOwnProperty.call(req.body, 'type')) issue.type = ISSUE_TYPES.includes(req.body.type) ? req.body.type : issue.type;
        if (Object.prototype.hasOwnProperty.call(req.body, 'status')) issue.status = ISSUE_STATUSES.includes(req.body.status) ? req.body.status : issue.status;
        if (Object.prototype.hasOwnProperty.call(req.body, 'priority')) issue.priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : issue.priority;
        if (Object.prototype.hasOwnProperty.call(req.body, 'owner')) issue.owner = cleanString(req.body.owner);
        if (Object.prototype.hasOwnProperty.call(req.body, 'groupName')) issue.groupName = cleanString(req.body.groupName);
        if (Object.prototype.hasOwnProperty.call(req.body, 'dueDate')) issue.dueDate = normalizeDate(req.body.dueDate);
        if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) issue.notes = cleanString(req.body.notes);

        addAuditLog(project, req.user, accessRole, {
            action: 'issue.updated',
            label: `Updated issue "${issue.title}"`,
            targetType: 'issue',
            targetId: String(issue._id),
            details: {
                status: issue.status,
                priority: issue.priority
            }
        });

        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            project: serializeProjectForUser(project, req.user),
            issue
        });
    } catch (err) {
        console.error('UPDATE TEAM ISSUE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/releases', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add releases.' });
        }

        const release = normalizeReleases([{
            ...req.body,
            createdBy: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!release) {
            return res.status(400).json({ message: 'Version and title are required.' });
        }

        project.releases.push(release);
        addAuditLog(project, req.user, accessRole, {
            action: 'release.created',
            label: `Added release "${release.version}"`,
            targetType: 'release',
            details: {
                status: release.status,
                title: release.title
            }
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            release: project.releases[project.releases.length - 1]
        });
    } catch (err) {
        console.error('CREATE TEAM RELEASE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id/releases/:releaseId', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.releaseId)) {
            return rejectInvalidObjectId(res, 'team release');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can update releases.' });
        }

        const release = project.releases.id(req.params.releaseId);
        if (!release) {
            return res.status(404).json({ message: 'Release not found.' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'version')) release.version = cleanString(req.body.version) || release.version;
        if (Object.prototype.hasOwnProperty.call(req.body, 'title')) release.title = cleanString(req.body.title) || release.title;
        if (Object.prototype.hasOwnProperty.call(req.body, 'status')) release.status = RELEASE_STATUSES.includes(req.body.status) ? req.body.status : release.status;
        if (Object.prototype.hasOwnProperty.call(req.body, 'targetDate')) release.targetDate = normalizeDate(req.body.targetDate);
        if (Object.prototype.hasOwnProperty.call(req.body, 'summary')) release.summary = cleanString(req.body.summary);

        addAuditLog(project, req.user, accessRole, {
            action: 'release.updated',
            label: `Updated release "${release.version}"`,
            targetType: 'release',
            targetId: String(release._id),
            details: {
                status: release.status,
                title: release.title
            }
        });

        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            project: serializeProjectForUser(project, req.user),
            release
        });
    } catch (err) {
        console.error('UPDATE TEAM RELEASE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/wiki-pages', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageDelivery(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add project docs.' });
        }

        const page = normalizeWikiPages([{
            ...req.body,
            updatedBy: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!page) {
            return res.status(400).json({ message: 'Doc title and content are required.' });
        }

        project.wikiPages.push(page);
        addAuditLog(project, req.user, accessRole, {
            action: 'wiki.created',
            label: `Saved project doc "${page.title}"`,
            targetType: 'wiki',
            details: {
                category: page.category
            }
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            page: project.wikiPages[project.wikiPages.length - 1]
        });
    } catch (err) {
        console.error('CREATE TEAM WIKI ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/maintenance-agent', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canRunAgents(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can refresh maintenance intelligence.' });
        }

        project.maintenanceAgent = buildMaintenanceAgentPlan(project.toObject());
        addAuditLog(project, req.user, accessRole, {
            action: 'agent.maintenance_refreshed',
            label: 'Refreshed maintenance agent',
            targetType: 'agent',
            targetId: 'maintenance'
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            project: serializeProjectForUser(project, req.user),
            maintenanceAgent: project.maintenanceAgent
        });
    } catch (err) {
        console.error('TEAM MAINTENANCE AGENT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/code-environments', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageCode(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add Code Arena environments.' });
        }

        const environment = normalizeCodeEnvironments([{
            ...req.body,
            owner: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!environment) {
            return res.status(400).json({ message: 'Environment name is required.' });
        }

        project.codeEnvironments.push(environment);
        addAuditLog(project, req.user, accessRole, {
            action: 'code_environment.created',
            label: `Added code environment "${environment.name}"`,
            targetType: 'code_environment',
            details: {
                os: environment.os,
                runtime: environment.runtime
            }
        });
        await project.save();
        const savedEnvironment = project.codeEnvironments[project.codeEnvironments.length - 1];
        broadcastProjectEvent(project._id, 'code_environment', {
            projectId: String(project._id),
            environment: savedEnvironment
        });

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            environment: savedEnvironment
        });
    } catch (err) {
        console.error('CREATE CODE ENVIRONMENT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/code-snippets', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageCode(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can add code snippets.' });
        }

        const snippet = normalizeCodeSnippets([{
            ...req.body,
            owner: req.user?.name || req.user?.email || 'Team member'
        }])[0];

        if (!snippet) {
            return res.status(400).json({ message: 'Snippet title and code are required.' });
        }

        project.codeSnippets.push(snippet);
        addAuditLog(project, req.user, accessRole, {
            action: 'code_snippet.created',
            label: `Added code snippet "${snippet.title}"`,
            targetType: 'code_snippet',
            details: {
                language: snippet.language,
                status: snippet.status
            }
        });
        await project.save();
        const savedSnippet = project.codeSnippets[project.codeSnippets.length - 1];
        broadcastProjectEvent(project._id, 'code_snippet', {
            projectId: String(project._id),
            snippet: savedSnippet
        });

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            snippet: savedSnippet
        });
    } catch (err) {
        console.error('CREATE CODE SNIPPET ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/code-snippets/:snippetId/run', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.snippetId)) {
            return rejectInvalidObjectId(res, 'code snippet');
        }

        const project = await TeamProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canManageCode(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can run sandbox code.' });
        }

        const snippet = project.codeSnippets.id(req.params.snippetId);
        if (!snippet) {
            return res.status(404).json({ message: 'Code snippet not found.' });
        }

        const runner = getCodeRunnerStatus();
        if (!runner.enabled) {
            return res.status(503).json({
                message: runner.note,
                runner
            });
        }

        const result = await runCodeInDocker({
            code: snippet.code,
            language: cleanString(req.body.language) || snippet.language,
            stdin: req.body.stdin
        });

        project.codeRuns.push({
            snippetId: snippet._id,
            title: snippet.title,
            language: result.language,
            image: result.image,
            status: result.status === 'completed' ? 'completed' : result.status === 'timeout' ? 'timeout' : 'failed',
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
            createdBy: req.user?.name || req.user?.email || 'Team member'
        });

        if (project.codeRuns.length > 30) {
            project.codeRuns = project.codeRuns.slice(-30);
        }

        addAuditLog(project, req.user, accessRole, {
            action: 'code_run.created',
            label: `Ran code snippet "${snippet.title}"`,
            targetType: 'code_run',
            targetId: String(snippet._id),
            details: {
                status: result.status,
                language: result.language,
                exitCode: result.exitCode
            }
        });

        await project.save();
        const savedRun = project.codeRuns[project.codeRuns.length - 1];
        broadcastProjectEvent(project._id, 'code_run', {
            projectId: String(project._id),
            run: savedRun
        });

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            run: savedRun,
            runner
        });
    } catch (err) {
        console.error('RUN CODE SNIPPET ERROR:', err);
        const status = err.status || 500;
        res.status(status).json({
            message: err.message || 'Code runner failed.',
            runner: getCodeRunnerStatus()
        });
    }
});

router.post('/:id/messages', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const message = cleanString(req.body.message).slice(0, 1200);
        const groupName = cleanString(req.body.groupName);
        const senderName = cleanString(req.body.senderName)
            || req.user?.name
            || req.user?.email
            || 'Project owner';

        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!hasPermission(accessRole, 'chat')) {
            return res.status(403).json({ message: 'You do not have permission to send project updates.' });
        }

        project.messages.push({
            groupName,
            senderName,
            message
        });

        if (project.messages.length > 250) {
            project.messages = project.messages.slice(-250);
        }

        addAuditLog(project, req.user, accessRole, {
            action: 'message.created',
            label: 'Posted project update',
            targetType: 'message',
            details: {
                groupName
            }
        });

        await project.save();
        const savedMessage = project.messages[project.messages.length - 1];
        broadcastProjectEvent(project._id, 'message', {
            projectId: String(project._id),
            message: savedMessage,
            messageCount: project.messages.length
        });

        res.status(201).json({
            project: serializeProjectForUser(project, req.user),
            message: savedMessage
        });
    } catch (err) {
        console.error('TEAM PROJECT MESSAGE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/ai-plan', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canRunAgents(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can generate the AI plan.' });
        }

        project.aiPlan = buildTeamAiPlan(project.toObject());
        addAuditLog(project, req.user, accessRole, {
            action: 'agent.ai_plan_refreshed',
            label: 'Refreshed team AI plan',
            targetType: 'agent',
            targetId: 'team_ai_plan'
        });
        await project.save();
        broadcastProjectEvent(project._id, 'project_update', getProjectCollabSnapshot(project));

        res.json({
            project: serializeProjectForUser(project, req.user),
            aiPlan: project.aiPlan
        });
    } catch (err) {
        console.error('TEAM AI PLAN ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/dev-agent', protect, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        const accessRole = getMemberRole(project, req.user._id);
        if (!canRunAgents(accessRole)) {
            return res.status(403).json({ message: 'Only owners, managers, delivery members, and editors can refresh developer intelligence.' });
        }

        project.developerAgent = buildDeveloperAgentPlan(project.toObject());
        addAuditLog(project, req.user, accessRole, {
            action: 'agent.dev_refreshed',
            label: 'Refreshed developer agent',
            targetType: 'agent',
            targetId: 'developer'
        });
        await project.save();
        broadcastProjectEvent(project._id, 'developer_agent', {
            projectId: String(project._id),
            developerAgent: project.developerAgent
        });

        res.json({
            project: serializeProjectForUser(project, req.user),
            developerAgent: project.developerAgent
        });
    } catch (err) {
        console.error('TEAM DEV AGENT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.delete('/:id', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        res.json({ message: 'Team project deleted.' });
    } catch (err) {
        console.error('DELETE TEAM PROJECT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
