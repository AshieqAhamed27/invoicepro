const express = require('express');
const TeamProject = require('../models/TeamProject');
const { protect, requirePro } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();

const TEAM_PROJECT_STATUSES = ['planning', 'active', 'review', 'completed', 'paused'];
const TASK_STATUSES = ['todo', 'doing', 'done', 'blocked'];
const PRIORITIES = ['low', 'normal', 'high'];
const AVAILABILITY = ['low', 'medium', 'high'];
const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];

const cleanString = (value) => String(value || '').trim();

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
    tasks: normalizeTasks(body.tasks)
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

const buildSummary = (projects = []) => ({
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

router.get('/', protect, requirePro, async(req, res) => {
    try {
        const projects = await TeamProject.find({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .lean();

        res.json({
            projects,
            summary: buildSummary(projects)
        });
    } catch (err) {
        console.error('GET TEAM PROJECTS ERROR:', err);
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
        const project = await TeamProject.create({
            ...payload,
            user: req.user._id,
            aiPlan
        });

        res.status(201).json({ project });
    } catch (err) {
        console.error('CREATE TEAM PROJECT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.patch('/:id', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const payload = normalizeProjectUpdates(req.body);
        if (Object.prototype.hasOwnProperty.call(payload, 'title') && !payload.title) {
            return res.status(400).json({ message: 'Project title is required.' });
        }

        const project = await TeamProject.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            payload,
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        res.json({ project });
    } catch (err) {
        console.error('UPDATE TEAM PROJECT ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/messages', protect, requirePro, async(req, res) => {
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

        const project = await TeamProject.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        project.messages.push({
            groupName,
            senderName,
            message
        });

        if (project.messages.length > 250) {
            project.messages = project.messages.slice(-250);
        }

        await project.save();

        res.status(201).json({
            project,
            message: project.messages[project.messages.length - 1]
        });
    } catch (err) {
        console.error('TEAM PROJECT MESSAGE ERROR:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/:id/ai-plan', protect, requirePro, async(req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return rejectInvalidObjectId(res, 'team project');
        }

        const project = await TeamProject.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!project) {
            return res.status(404).json({ message: 'Team project not found.' });
        }

        project.aiPlan = buildTeamAiPlan(project.toObject());
        await project.save();

        res.json({ project, aiPlan: project.aiPlan });
    } catch (err) {
        console.error('TEAM AI PLAN ERROR:', err);
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
