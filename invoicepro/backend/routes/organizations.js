const express = require('express');
const crypto = require('crypto');
const https = require('https');
const Organization = require('../models/Organization');
const TeamProject = require('../models/TeamProject');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { isValidObjectId, rejectInvalidObjectId } = require('../utils/objectId');

const router = express.Router();

const MAX_AUDIT_LOGS = 400;
const ORG_ROLES = ['owner', 'admin', 'billing', 'security', 'member', 'viewer'];

const ROLE_DEFINITIONS = {
    owner: {
        label: 'Owner',
        description: 'Full company control, billing, security, members, exports, and projects.',
        permissions: ['manageOrganization', 'manageMembers', 'manageBilling', 'manageSecurity', 'viewProjects', 'viewClients', 'exportAudit', 'exportBackup']
    },
    admin: {
        label: 'Admin',
        description: 'Manages company projects, members, billing, security, and exports.',
        permissions: ['manageOrganization', 'manageMembers', 'manageBilling', 'manageSecurity', 'viewProjects', 'viewClients', 'exportAudit', 'exportBackup']
    },
    billing: {
        label: 'Billing',
        description: 'Manages seat billing, payments, and billing exports.',
        permissions: ['manageBilling', 'viewProjects', 'viewClients', 'exportAudit']
    },
    security: {
        label: 'Security',
        description: 'Manages SSO, access rules, retention, backup, and audit exports.',
        permissions: ['manageSecurity', 'viewProjects', 'viewClients', 'exportAudit', 'exportBackup']
    },
    member: {
        label: 'Member',
        description: 'Works inside company projects and sees assigned workflow data.',
        permissions: ['viewProjects']
    },
    viewer: {
        label: 'Viewer',
        description: 'Read-only company workspace access.',
        permissions: ['viewProjects']
    }
};

const cleanString = (value) => String(value || '').trim();
const normalizeEmail = (email) => cleanString(email).toLowerCase();
const normalizeRole = (role) => ORG_ROLES.includes(String(role || '').toLowerCase()) ? String(role).toLowerCase() : 'member';

const normalizeDomain = (value) => {
    const domain = cleanString(value)
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];

    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : '';
};

const getEmailDomain = (email) => {
    const parts = normalizeEmail(email).split('@');
    return parts.length === 2 ? normalizeDomain(parts[1]) : '';
};

const slugify = (value) => {
    const slug = cleanString(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    return slug || `company-${Date.now()}`;
};

const getRoleDefinition = (role) => ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.viewer;
const getRolePermissions = (role) => {
    const permissions = new Set([
        ...ROLE_DEFINITIONS.viewer.permissions,
        ...(getRoleDefinition(role).permissions || [])
    ]);

    return Object.fromEntries([...new Set(Object.values(ROLE_DEFINITIONS).flatMap((item) => item.permissions))]
        .map((permission) => [permission, permissions.has(permission)]));
};

const getEffectivePermissions = (organization, role) => {
    const permissions = getRolePermissions(role);
    const paymentPolicy = organization?.security?.paymentPolicy || 'owners_billing';
    const clientVisibility = organization?.security?.clientVisibility || 'delivery_finance_admin';

    if (paymentPolicy === 'owner_only') {
        permissions.manageBilling = role === 'owner';
    } else if (paymentPolicy === 'admins_billing') {
        permissions.manageBilling = ['owner', 'admin', 'billing'].includes(role);
    } else {
        permissions.manageBilling = ['owner', 'billing'].includes(role);
    }

    if (clientVisibility === 'owner_admin_only') {
        permissions.viewClients = ['owner', 'admin'].includes(role);
    } else if (clientVisibility === 'delivery_finance_admin') {
        permissions.viewClients = ['owner', 'admin', 'billing', 'security'].includes(role);
    } else {
        permissions.viewClients = Boolean(permissions.viewProjects);
    }

    return permissions;
};

const hasOrgPermission = (organization, role, permission) => Boolean(getEffectivePermissions(organization, role)[permission]);

const getMemberRole = (organization, user) => {
    if (!organization || !user) return '';
    const userId = String(user._id || user.id || '');
    const userEmail = normalizeEmail(user.email);

    if (String(organization.owner || '') === userId) return 'owner';

    const member = (organization.members || []).find((item) => {
        const sameUser = item.user && String(item.user) === userId;
        const sameEmail = normalizeEmail(item.email) === userEmail;
        return (sameUser || sameEmail) && item.status === 'active';
    });

    return member?.role || '';
};

const findOrganizationForUser = async(user) => {
    const userId = user?._id;
    const email = normalizeEmail(user?.email);

    if (!userId && !email) return null;

    return Organization.findOne({
        $or: [
            { owner: userId },
            { 'members.user': userId },
            { 'members.email': email }
        ]
    }).sort({ createdAt: -1 });
};

const getOrganizationForUser = async(id, user) => {
    if (!isValidObjectId(id)) return null;

    const organization = await Organization.findById(id);
    if (!organization) return null;

    const role = getMemberRole(organization, user);
    if (!role && user?.role !== 'admin') return null;

    return organization;
};

const addAuditLog = (organization, user, role, entry = {}) => {
    if (!organization) return null;
    if (!Array.isArray(organization.auditLogs)) organization.auditLogs = [];

    const log = {
        action: cleanString(entry.action).slice(0, 100) || 'organization.updated',
        label: cleanString(entry.label).slice(0, 180),
        targetType: cleanString(entry.targetType).slice(0, 80),
        targetId: cleanString(entry.targetId).slice(0, 100),
        actor: {
            user: user?._id || null,
            name: cleanString(user?.name) || normalizeEmail(user?.email) || 'Team member',
            email: normalizeEmail(user?.email),
            role: role || ''
        },
        details: entry.details && typeof entry.details === 'object' ? entry.details : {},
        createdAt: new Date()
    };

    organization.auditLogs.push(log);
    if (organization.auditLogs.length > MAX_AUDIT_LOGS) {
        organization.auditLogs = organization.auditLogs.slice(-MAX_AUDIT_LOGS);
    }

    return log;
};

const uniqueMembers = (members = []) => {
    const seen = new Set();
    return members.filter((member) => {
        const key = normalizeEmail(member.email) || String(member.user || member._id || '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const calculateSeatBilling = (organization) => {
    const billing = organization?.billing || {};
    const currency = billing.currency === 'USD' ? 'USD' : 'INR';
    const seatPrice = currency === 'USD'
        ? Number(billing.seatPriceUsd || 5)
        : Number(billing.seatPriceInr || 299);
    const cycle = billing.cycle === 'yearly' ? 'yearly' : 'monthly';
    const activeMembers = uniqueMembers(organization?.members || []).filter((member) => member.status === 'active');
    const billableSeats = Math.max(Number(billing.includedSeats || 1), activeMembers.length || 1);
    const monthlyTotal = billableSeats * seatPrice;
    const cycleTotal = cycle === 'yearly' ? monthlyTotal * 12 : monthlyTotal;

    return {
        currency,
        cycle,
        seatPrice,
        seatPriceInr: Number(billing.seatPriceInr || 299),
        seatPriceUsd: Number(billing.seatPriceUsd || 5),
        activeSeats: activeMembers.length,
        includedSeats: Number(billing.includedSeats || 1),
        billableSeats,
        monthlyTotal,
        cycleTotal,
        status: billing.status || 'preview',
        provider: billing.provider || 'razorpay',
        providerSubscriptionId: billing.providerSubscriptionId || '',
        providerOrderId: billing.providerOrderId || '',
        providerPaymentId: billing.providerPaymentId || '',
        activatedAt: billing.activatedAt || null,
        currentPeriodStart: billing.currentPeriodStart || null,
        currentPeriodEnd: billing.currentPeriodEnd || null,
        lastCalculatedAt: billing.lastCalculatedAt || null
    };
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const getEnterpriseReadiness = (organization, projectCount = 0) => {
    const members = uniqueMembers(organization?.members || []);
    const activeMembers = members.filter((member) => member.status === 'active');
    const nonOwnerMembers = members.filter((member) => member.role !== 'owner');
    const billing = calculateSeatBilling(organization);
    const ssoDomains = (organization?.sso?.allowedDomains || []).map(normalizeDomain).filter(Boolean);
    const auditCount = Array.isArray(organization?.auditLogs) ? organization.auditLogs.length : 0;
    const retention = organization?.retention || {};
    const security = organization?.security || {};

    const items = [
        {
            id: 'workspace',
            label: 'Organization workspace',
            detail: 'Company account, owner, domain, and workspace identity are created.',
            done: Boolean(organization?.name && organization?.owner && activeMembers.length >= 1),
            action: 'Create organization'
        },
        {
            id: 'members',
            label: 'Team members and roles',
            detail: 'Invite at least one non-owner member and assign owner/admin/billing/security/member/viewer roles.',
            done: nonOwnerMembers.length >= 1,
            action: 'Add a member'
        },
        {
            id: 'billing',
            label: 'Seat billing',
            detail: 'Billable seats, currency, cycle, and payment status are ready for company billing.',
            done: billing.status === 'active' || Boolean(billing.providerPaymentId),
            action: 'Pay seat billing'
        },
        {
            id: 'security',
            label: 'Admin security settings',
            detail: 'Invite policy, payment control, client visibility, and domain restrictions are configured.',
            done: Boolean(security.invitePolicy && security.paymentPolicy && security.clientVisibility),
            action: 'Save security settings'
        },
        {
            id: 'sso',
            label: 'SSO and domain control',
            detail: 'Google Workspace or Microsoft Entra domain access is configured for company users.',
            done: Boolean(organization?.sso?.enabled && organization?.sso?.provider && ssoDomains.length),
            action: 'Configure SSO'
        },
        {
            id: 'audit',
            label: 'Audit history',
            detail: 'Organization actions are logged and exportable as CSV, PDF, or JSON.',
            done: auditCount > 0,
            action: 'Export audit'
        },
        {
            id: 'backup',
            label: 'Backup and retention',
            detail: 'Backup export, data retention, and audit retention are configured.',
            done: Boolean(retention.backupEnabled && retention.auditLogRetentionDays && retention.dataRetentionDays),
            action: 'Export backup'
        },
        {
            id: 'workrooms',
            label: 'Company workrooms',
            detail: 'At least one client workroom is attached to the organization.',
            done: Number(projectCount || 0) > 0,
            action: 'Attach workrooms'
        }
    ];

    const completed = items.filter((item) => item.done).length;
    const score = Math.round((completed / items.length) * 100);
    const level = score >= 90 ? 'enterprise_ready' : score >= 65 ? 'pilot_ready' : score >= 35 ? 'setup_needed' : 'foundation_needed';
    const label = score >= 90
        ? 'Enterprise ready'
        : score >= 65
            ? 'Pilot ready'
            : score >= 35
                ? 'Setup in progress'
                : 'Foundation needed';

    return {
        score,
        level,
        label,
        completed,
        total: items.length,
        nextAction: items.find((item) => !item.done) || null,
        items
    };
};

const serializeMember = (member) => ({
    id: member._id,
    user: member.user,
    name: member.name || '',
    email: member.email || '',
    role: member.role || 'member',
    roleLabel: getRoleDefinition(member.role).label,
    status: member.status || 'active',
    joinedAt: member.joinedAt,
    invitedAt: member.invitedAt,
    disabledAt: member.disabledAt
});

const serializeAuditLogs = (logs = []) =>
    [...(logs || [])]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
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

const serializeOrganization = async(organization, user) => {
    if (!organization) return null;

    const accessRole = getMemberRole(organization, user) || (user?.role === 'admin' ? 'admin' : 'viewer');
    const projectCount = await TeamProject.countDocuments({ organization: organization._id });

    return {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain || '',
        owner: organization.owner,
        accessRole,
        accessLabel: getRoleDefinition(accessRole).label,
        permissions: getEffectivePermissions(organization, accessRole),
        roleOptions: Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => ({
            role,
            label: definition.label,
            description: definition.description
        })),
        members: uniqueMembers(organization.members || []).map(serializeMember),
        billing: calculateSeatBilling(organization),
        security: organization.security || {},
        sso: organization.sso || {},
        retention: organization.retention || {},
        enterpriseReadiness: getEnterpriseReadiness(organization, projectCount),
        auditLogs: hasOrgPermission(organization, accessRole, 'exportAudit') ? serializeAuditLogs(organization.auditLogs).slice(0, 50) : [],
        projectCount,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
    };
};

const canInviteForPolicy = (organization, role) => {
    const policy = organization?.security?.invitePolicy || 'owners_admins';
    if (['owner', 'admin'].includes(role)) return true;
    if (policy === 'managers') return ['billing', 'security'].includes(role);
    if (policy === 'any_member') return ['billing', 'security', 'member'].includes(role);
    return false;
};

const buildCsv = (rows) => {
    const escapeCell = (value) => {
        const text = String(value ?? '').replace(/\r?\n/g, ' ');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const headers = ['createdAt', 'source', 'action', 'label', 'actorName', 'actorEmail', 'actorRole', 'targetType', 'targetId'];
    return [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))
    ].join('\n');
};

const escapePdfText = (value) => String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 110);

const buildSimplePdf = (title, rows) => {
    const lines = [
        title,
        `Generated: ${new Date().toISOString()}`,
        '',
        ...rows.slice(0, 65).map((row) =>
            `${new Date(row.createdAt).toISOString().slice(0, 19)} | ${row.source} | ${row.action} | ${row.actorEmail} | ${row.label}`
        )
    ];
    const text = lines.map((line, index) =>
        `/F1 ${index === 0 ? '16' : '9'} Tf (${escapePdfText(line)}) Tj T*`
    ).join('\n');
    const content = `BT 40 790 Td ${text} ET`;
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
};

const getRazorpayAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

const createRazorpayOrder = (payload, authHeader) => new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
        hostname: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
            try {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    body: body ? JSON.parse(body) : {}
                });
            } catch (err) {
                resolve({
                    ok: false,
                    status: res.statusCode || 500,
                    body: { message: body || 'Invalid Razorpay response' }
                });
            }
        });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
});

const getRazorpayErrorMessage = (body) => (
    body?.error?.description ||
    body?.error?.reason ||
    body?.message ||
    'Failed to create organization billing order'
);

const getExportRows = async(organization) => {
    const orgRows = serializeAuditLogs(organization.auditLogs).map((log) => ({
        createdAt: log.createdAt,
        source: 'organization',
        action: log.action,
        label: log.label,
        actorName: log.actor?.name || '',
        actorEmail: log.actor?.email || '',
        actorRole: log.actor?.role || '',
        targetType: log.targetType || '',
        targetId: log.targetId || ''
    }));

    const projects = await TeamProject.find({ organization: organization._id })
        .select('title auditLogs')
        .lean();
    const projectRows = projects.flatMap((project) =>
        serializeAuditLogs(project.auditLogs).map((log) => ({
            createdAt: log.createdAt,
            source: `project:${project.title || project._id}`,
            action: log.action,
            label: log.label,
            actorName: log.actor?.name || '',
            actorEmail: log.actor?.email || '',
            actorRole: log.actor?.role || '',
            targetType: log.targetType || '',
            targetId: log.targetId || ''
        }))
    );

    return [...orgRows, ...projectRows]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const syncUserMembership = async(user, organization, role) => {
    if (!user || !organization) return;

    user.enterpriseOrganization = organization._id;
    user.enterpriseRole = role;
    user.enterpriseJoinedAt = user.enterpriseJoinedAt || new Date();
    await user.save();
};

router.get('/me', protect, async(req, res) => {
    try {
        const organization = await findOrganizationForUser(req.user);

        res.json({
            organization: organization ? await serializeOrganization(organization, req.user) : null,
            defaults: {
                seatPriceInr: 299,
                seatPriceUsd: 5,
                roleOptions: Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => ({
                    role,
                    label: definition.label,
                    description: definition.description
                }))
            }
        });
    } catch (err) {
        console.error('ORGANIZATION ME ERROR:', err);
        res.status(500).json({ message: 'Unable to load organization workspace.' });
    }
});

router.post('/', protect, async(req, res) => {
    try {
        const existing = await Organization.findOne({ owner: req.user._id });
        if (existing) {
            return res.status(200).json({
                organization: await serializeOrganization(existing, req.user),
                message: 'Organization workspace already exists.'
            });
        }

        const name = cleanString(req.body.name) || cleanString(req.user.companyName) || `${req.user.name || 'ClientFlow'} Company`;
        const domain = normalizeDomain(req.body.domain) || getEmailDomain(req.user.email);
        let slug = slugify(req.body.slug || name);
        const slugExists = await Organization.exists({ slug });
        if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

        const organization = new Organization({
            name,
            slug,
            domain,
            owner: req.user._id,
            members: [{
                user: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: 'owner',
                status: 'active',
                joinedAt: new Date()
            }],
            sso: {
                enabled: Boolean(domain),
                provider: domain ? 'google_workspace' : '',
                allowedDomains: domain ? [domain] : []
            }
        });

        addAuditLog(organization, req.user, 'owner', {
            action: 'organization.created',
            label: `Created organization "${name}"`,
            targetType: 'organization',
            details: { domain }
        });

        await organization.save();
        await syncUserMembership(req.user, organization, 'owner');
        await TeamProject.updateMany(
            { user: req.user._id, organization: null },
            { $set: { organization: organization._id } }
        );

        res.status(201).json({
            organization: await serializeOrganization(organization, req.user),
            message: 'Organization workspace created.'
        });
    } catch (err) {
        console.error('CREATE ORGANIZATION ERROR:', err);
        res.status(500).json({ message: 'Unable to create organization workspace.' });
    }
});

router.get('/:id', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        res.json({ organization: await serializeOrganization(organization, req.user) });
    } catch (err) {
        console.error('GET ORGANIZATION ERROR:', err);
        res.status(500).json({ message: 'Unable to load organization.' });
    }
});

router.patch('/:id', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'manageOrganization') && !hasOrgPermission(organization, role, 'manageBilling') && !hasOrgPermission(organization, role, 'manageSecurity')) {
            return res.status(403).json({ message: 'Your organization role cannot update enterprise settings.' });
        }

        const updates = [];

        if (hasOrgPermission(organization, role, 'manageOrganization')) {
            const name = cleanString(req.body.name);
            const domain = normalizeDomain(req.body.domain);
            if (name) {
                organization.name = name;
                updates.push('name');
            }
            if (domain || req.body.domain === '') {
                organization.domain = domain;
                updates.push('domain');
            }
        }

        if (hasOrgPermission(organization, role, 'manageBilling') && req.body.billing) {
            const billing = req.body.billing || {};
            organization.billing.currency = billing.currency === 'USD' ? 'USD' : 'INR';
            organization.billing.cycle = billing.cycle === 'yearly' ? 'yearly' : 'monthly';
            organization.billing.seatPriceInr = Math.max(0, Number(billing.seatPriceInr || organization.billing.seatPriceInr || 299));
            organization.billing.seatPriceUsd = Math.max(0, Number(billing.seatPriceUsd || organization.billing.seatPriceUsd || 5));
            organization.billing.includedSeats = Math.max(1, Math.floor(Number(billing.includedSeats || organization.billing.includedSeats || 1)));
            organization.billing.lastCalculatedAt = new Date();
            updates.push('billing');
        }

        if (hasOrgPermission(organization, role, 'manageSecurity') && req.body.security) {
            const security = req.body.security || {};
            if (['owners_admins', 'managers', 'any_member'].includes(security.invitePolicy)) {
                organization.security.invitePolicy = security.invitePolicy;
            }
            if (['owners_billing', 'admins_billing', 'owner_only'].includes(security.paymentPolicy)) {
                organization.security.paymentPolicy = security.paymentPolicy;
            }
            if (['all_members', 'delivery_finance_admin', 'owner_admin_only'].includes(security.clientVisibility)) {
                organization.security.clientVisibility = security.clientVisibility;
            }
            organization.security.requireSso = Boolean(security.requireSso);
            organization.security.enforceAllowedDomains = Boolean(security.enforceAllowedDomains);
            updates.push('security');
        }

        if (hasOrgPermission(organization, role, 'manageSecurity') && req.body.sso) {
            const sso = req.body.sso || {};
            const allowedDomains = Array.isArray(sso.allowedDomains)
                ? sso.allowedDomains.map(normalizeDomain).filter(Boolean).slice(0, 10)
                : organization.sso.allowedDomains;
            const provider = ['google_workspace', 'microsoft_entra'].includes(sso.provider) ? sso.provider : '';

            organization.sso.enabled = Boolean(sso.enabled);
            organization.sso.provider = provider;
            organization.sso.allowedDomains = allowedDomains;
            organization.sso.tenantId = cleanString(sso.tenantId).slice(0, 160);
            organization.sso.lastVerifiedAt = organization.sso.enabled ? new Date() : organization.sso.lastVerifiedAt;
            updates.push('sso');
        }

        if (hasOrgPermission(organization, role, 'manageSecurity') && req.body.retention) {
            const retention = req.body.retention || {};
            organization.retention.auditLogRetentionDays = Math.max(30, Math.min(2555, Math.floor(Number(retention.auditLogRetentionDays || 365))));
            organization.retention.dataRetentionDays = Math.max(90, Math.min(3650, Math.floor(Number(retention.dataRetentionDays || 1095))));
            organization.retention.backupFrequency = ['manual', 'weekly', 'monthly'].includes(retention.backupFrequency)
                ? retention.backupFrequency
                : organization.retention.backupFrequency;
            organization.retention.backupEnabled = Boolean(retention.backupEnabled);
            updates.push('retention');
        }

        addAuditLog(organization, req.user, role, {
            action: 'organization.settings_updated',
            label: `Updated enterprise settings: ${updates.join(', ') || 'none'}`,
            targetType: 'organization',
            details: { updates }
        });

        await organization.save();

        res.json({
            organization: await serializeOrganization(organization, req.user),
            message: 'Enterprise settings updated.'
        });
    } catch (err) {
        console.error('UPDATE ORGANIZATION ERROR:', err);
        res.status(500).json({ message: 'Unable to update organization.' });
    }
});

router.get('/:id/projects', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'viewProjects')) {
            return res.status(403).json({ message: 'Your role cannot view company projects.' });
        }

        const projects = await TeamProject.find({ organization: organization._id })
            .select('title clientName status budget currency deadline updatedAt members')
            .sort({ updatedAt: -1 })
            .lean();

        res.json({
            projects: projects.map((project) => ({
                id: project._id,
                title: project.title,
                clientName: project.clientName,
                status: project.status,
                budget: project.budget,
                currency: project.currency,
                deadline: project.deadline,
                memberCount: uniqueMembers(project.members || []).length,
                updatedAt: project.updatedAt
            }))
        });
    } catch (err) {
        console.error('ORGANIZATION PROJECTS ERROR:', err);
        res.status(500).json({ message: 'Unable to load company projects.' });
    }
});

router.post('/:id/attach-current-projects', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user);
        if (!hasOrgPermission(organization, role, 'manageOrganization')) {
            return res.status(403).json({ message: 'Only organization admins can attach projects.' });
        }

        const result = await TeamProject.updateMany(
            { user: req.user._id, organization: null },
            { $set: { organization: organization._id } }
        );

        addAuditLog(organization, req.user, role, {
            action: 'organization.projects_attached',
            label: `Attached ${result.modifiedCount || 0} existing workrooms`,
            targetType: 'project',
            details: { modifiedCount: result.modifiedCount || 0 }
        });
        await organization.save();

        res.json({
            message: 'Existing workrooms attached to organization.',
            modifiedCount: result.modifiedCount || 0,
            organization: await serializeOrganization(organization, req.user)
        });
    } catch (err) {
        console.error('ATTACH ORGANIZATION PROJECTS ERROR:', err);
        res.status(500).json({ message: 'Unable to attach existing workrooms.' });
    }
});

router.post('/:id/members', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const accessRole = getMemberRole(organization, req.user);
        if (!canInviteForPolicy(organization, accessRole)) {
            return res.status(403).json({ message: 'Your organization role cannot invite members.' });
        }

        const email = normalizeEmail(req.body.email);
        const role = normalizeRole(req.body.role);
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'Member email is required.' });
        }
        if (role === 'owner') {
            return res.status(400).json({ message: 'Owner role cannot be assigned from invite.' });
        }

        if (organization.security?.enforceAllowedDomains) {
            const domain = getEmailDomain(email);
            const allowedDomains = (organization.sso?.allowedDomains || []).map(normalizeDomain).filter(Boolean);
            if (allowedDomains.length && !allowedDomains.includes(domain)) {
                return res.status(400).json({ message: 'This email domain is not allowed by organization security settings.' });
            }
        }

        const existingUser = await User.findOne({ email }).select('name email');
        const existingMember = organization.members.find((member) => normalizeEmail(member.email) === email);

        if (existingMember) {
            existingMember.role = role;
            existingMember.status = existingUser ? 'active' : 'invited';
            existingMember.user = existingUser?._id || existingMember.user || null;
            existingMember.name = existingUser?.name || cleanString(req.body.name) || existingMember.name;
        } else {
            organization.members.push({
                user: existingUser?._id || null,
                name: existingUser?.name || cleanString(req.body.name),
                email,
                role,
                status: existingUser ? 'active' : 'invited',
                joinedAt: existingUser ? new Date() : null,
                invitedAt: new Date()
            });
        }

        if (existingUser) {
            existingUser.enterpriseOrganization = organization._id;
            existingUser.enterpriseRole = role;
            existingUser.enterpriseJoinedAt = existingUser.enterpriseJoinedAt || new Date();
            await existingUser.save();
        }

        organization.billing.lastCalculatedAt = new Date();
        addAuditLog(organization, req.user, accessRole, {
            action: 'organization.member_invited',
            label: `Added ${email} as ${getRoleDefinition(role).label}`,
            targetType: 'member',
            targetId: email,
            details: { role, status: existingUser ? 'active' : 'invited' }
        });

        await organization.save();

        res.status(201).json({
            organization: await serializeOrganization(organization, req.user),
            message: existingUser ? 'Member added to organization.' : 'Member invite saved. Ask them to sign up with this email.'
        });
    } catch (err) {
        console.error('ADD ORGANIZATION MEMBER ERROR:', err);
        res.status(500).json({ message: 'Unable to add organization member.' });
    }
});

router.patch('/:id/members/:memberId', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const accessRole = getMemberRole(organization, req.user);
        if (!hasOrgPermission(organization, accessRole, 'manageMembers')) {
            return res.status(403).json({ message: 'Your organization role cannot manage members.' });
        }

        const member = organization.members.id(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found.' });
        }
        if (member.role === 'owner') {
            return res.status(400).json({ message: 'Owner member cannot be changed here.' });
        }

        const nextRole = req.body.role ? normalizeRole(req.body.role) : member.role;
        const nextStatus = ['active', 'invited', 'disabled'].includes(req.body.status) ? req.body.status : member.status;
        if (nextRole === 'owner') {
            return res.status(400).json({ message: 'Owner role cannot be assigned here.' });
        }

        member.role = nextRole;
        member.status = nextStatus;
        member.disabledAt = nextStatus === 'disabled' ? new Date() : null;
        organization.billing.lastCalculatedAt = new Date();

        if (member.user) {
            await User.findByIdAndUpdate(member.user, {
                enterpriseOrganization: nextStatus === 'disabled' ? null : organization._id,
                enterpriseRole: nextStatus === 'disabled' ? '' : nextRole
            });
        }

        addAuditLog(organization, req.user, accessRole, {
            action: 'organization.member_updated',
            label: `Updated ${member.email}`,
            targetType: 'member',
            targetId: String(member._id),
            details: { role: nextRole, status: nextStatus }
        });

        await organization.save();

        res.json({
            organization: await serializeOrganization(organization, req.user),
            message: 'Member updated.'
        });
    } catch (err) {
        console.error('UPDATE ORGANIZATION MEMBER ERROR:', err);
        res.status(500).json({ message: 'Unable to update organization member.' });
    }
});

router.delete('/:id/members/:memberId', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const accessRole = getMemberRole(organization, req.user);
        if (!hasOrgPermission(organization, accessRole, 'manageMembers')) {
            return res.status(403).json({ message: 'Your organization role cannot remove members.' });
        }

        const member = organization.members.id(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found.' });
        }
        if (member.role === 'owner') {
            return res.status(400).json({ message: 'Owner member cannot be removed.' });
        }

        const removedEmail = member.email;
        const removedUser = member.user;
        member.deleteOne();
        organization.billing.lastCalculatedAt = new Date();

        if (removedUser) {
            await User.findByIdAndUpdate(removedUser, {
                enterpriseOrganization: null,
                enterpriseRole: ''
            });
        }

        addAuditLog(organization, req.user, accessRole, {
            action: 'organization.member_removed',
            label: `Removed ${removedEmail}`,
            targetType: 'member',
            targetId: String(req.params.memberId)
        });

        await organization.save();

        res.json({
            organization: await serializeOrganization(organization, req.user),
            message: 'Member removed.'
        });
    } catch (err) {
        console.error('REMOVE ORGANIZATION MEMBER ERROR:', err);
        res.status(500).json({ message: 'Unable to remove organization member.' });
    }
});

router.get('/:id/billing/preview', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'manageBilling')) {
            return res.status(403).json({ message: 'Your organization role cannot view seat billing.' });
        }

        organization.billing.lastCalculatedAt = new Date();
        await organization.save();

        res.json({ billing: calculateSeatBilling(organization) });
    } catch (err) {
        console.error('ORGANIZATION BILLING PREVIEW ERROR:', err);
        res.status(500).json({ message: 'Unable to calculate seat billing.' });
    }
});

router.post('/:id/billing/order', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'manageBilling')) {
            return res.status(403).json({ message: 'Your organization role cannot pay seat billing.' });
        }

        const billing = calculateSeatBilling(organization);
        const amount = Number(billing.cycleTotal || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Organization billing amount is not valid.' });
        }

        const orderPayload = {
            amount: Math.round(amount * 100),
            currency: billing.currency || 'INR',
            receipt: `org_${String(organization._id).slice(-8)}_${Date.now()}`,
            notes: {
                organizationId: String(organization._id),
                organizationName: organization.name,
                billableSeats: String(billing.billableSeats || 0),
                cycle: billing.cycle || 'monthly',
                checkoutType: 'enterprise_seat_billing'
            }
        };

        const authHeader = getRazorpayAuthHeader();
        if (process.env.PAYMENT_SIMULATION === 'true') {
            const simulatedOrder = {
                id: `order_sim_org_${Date.now()}`,
                amount: orderPayload.amount,
                currency: orderPayload.currency,
                receipt: orderPayload.receipt,
                notes: orderPayload.notes
            };

            organization.billing.providerOrderId = simulatedOrder.id;
            organization.billing.lastCalculatedAt = new Date();
            addAuditLog(organization, req.user, role, {
                action: 'organization.billing_order_created',
                label: `Created simulated seat billing order for ${billing.billableSeats} seats`,
                targetType: 'billing',
                targetId: simulatedOrder.id,
                details: { amount, currency: billing.currency, cycle: billing.cycle }
            });
            await organization.save();

            return res.json({
                keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_simulation',
                order: simulatedOrder,
                billing: calculateSeatBilling(organization),
                simulation: true
            });
        }

        if (!authHeader) {
            return res.status(500).json({ message: 'Razorpay keys are not configured for enterprise seat billing.' });
        }

        const razorpayRes = await createRazorpayOrder(orderPayload, authHeader);
        if (!razorpayRes.ok) {
            return res.status(502).json({ message: getRazorpayErrorMessage(razorpayRes.body) });
        }

        organization.billing.providerOrderId = razorpayRes.body.id || '';
        organization.billing.lastCalculatedAt = new Date();
        addAuditLog(organization, req.user, role, {
            action: 'organization.billing_order_created',
            label: `Created seat billing order for ${billing.billableSeats} seats`,
            targetType: 'billing',
            targetId: razorpayRes.body.id || '',
            details: { amount, currency: billing.currency, cycle: billing.cycle }
        });
        await organization.save();

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            order: razorpayRes.body,
            billing: calculateSeatBilling(organization),
            simulation: false
        });
    } catch (err) {
        console.error('ORGANIZATION BILLING ORDER ERROR:', err);
        res.status(500).json({ message: 'Unable to create organization billing order.' });
    }
});

router.post('/:id/billing/verify', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'manageBilling')) {
            return res.status(403).json({ message: 'Your organization role cannot verify seat billing.' });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body || {};

        if (!razorpay_order_id) {
            return res.status(400).json({ message: 'Missing organization billing order id.' });
        }

        const isSimulation = process.env.PAYMENT_SIMULATION === 'true' && String(razorpay_order_id).startsWith('order_sim_org_');
        if (!isSimulation) {
            if (!razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ message: 'Missing Razorpay payment verification fields.' });
            }
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Razorpay key secret is not configured.' });
            }

            const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
            const digest = shasum.digest('hex');
            if (digest !== razorpay_signature) {
                return res.status(400).json({ message: 'Invalid organization billing payment signature.' });
            }
        }

        const now = new Date();
        const billing = calculateSeatBilling(organization);
        organization.billing.status = 'active';
        organization.billing.providerOrderId = razorpay_order_id;
        organization.billing.providerPaymentId = razorpay_payment_id || `pay_sim_org_${Date.now()}`;
        organization.billing.activatedAt = organization.billing.activatedAt || now;
        organization.billing.currentPeriodStart = now;
        organization.billing.currentPeriodEnd = addDays(now, billing.cycle === 'yearly' ? 365 : 30);
        organization.billing.lastCalculatedAt = now;

        addAuditLog(organization, req.user, role, {
            action: 'organization.billing_paid',
            label: `Seat billing paid for ${billing.billableSeats} seats`,
            targetType: 'billing',
            targetId: razorpay_order_id,
            details: {
                paymentId: razorpay_payment_id || '',
                amount: billing.cycleTotal,
                currency: billing.currency,
                cycle: billing.cycle,
                billableSeats: billing.billableSeats
            }
        });

        await organization.save();

        res.json({
            organization: await serializeOrganization(organization, req.user),
            message: 'Enterprise seat billing is active for this cycle.'
        });
    } catch (err) {
        console.error('ORGANIZATION BILLING VERIFY ERROR:', err);
        res.status(500).json({ message: 'Unable to verify organization billing payment.' });
    }
});

router.get('/:id/audit-logs/export', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'exportAudit')) {
            return res.status(403).json({ message: 'Your organization role cannot export audit logs.' });
        }

        const format = String(req.query.format || 'csv').toLowerCase();
        const rows = await getExportRows(organization);

        addAuditLog(organization, req.user, role, {
            action: 'organization.audit_exported',
            label: `Exported audit logs as ${format}`,
            targetType: 'audit',
            details: { format, rows: rows.length }
        });
        await organization.save();

        if (format === 'json') {
            return res.json({ organization: organization.name, rows });
        }

        if (format === 'pdf') {
            const pdf = buildSimplePdf(`${organization.name} audit log`, rows);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${organization.slug}-audit-log.pdf"`);
            return res.send(pdf);
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${organization.slug}-audit-log.csv"`);
        return res.send(buildCsv(rows));
    } catch (err) {
        console.error('EXPORT ORGANIZATION AUDIT ERROR:', err);
        res.status(500).json({ message: 'Unable to export audit logs.' });
    }
});

router.get('/:id/backup/export', protect, async(req, res) => {
    try {
        const organization = await getOrganizationForUser(req.params.id, req.user);
        if (!organization) {
            if (!isValidObjectId(req.params.id)) return rejectInvalidObjectId(res, 'organization');
            return res.status(404).json({ message: 'Organization not found.' });
        }

        const role = getMemberRole(organization, req.user) || (req.user.role === 'admin' ? 'admin' : '');
        if (!hasOrgPermission(organization, role, 'exportBackup')) {
            return res.status(403).json({ message: 'Your organization role cannot export backup data.' });
        }

        const projects = await TeamProject.find({ organization: organization._id }).lean();

        organization.retention.lastBackupAt = new Date();
        addAuditLog(organization, req.user, role, {
            action: 'organization.backup_exported',
            label: `Exported organization backup with ${projects.length} projects`,
            targetType: 'backup',
            details: { projectCount: projects.length }
        });
        await organization.save();

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${organization.slug}-backup.json"`);
        return res.json({
            exportedAt: new Date().toISOString(),
            organization: organization.toObject(),
            projects
        });
    } catch (err) {
        console.error('EXPORT ORGANIZATION BACKUP ERROR:', err);
        res.status(500).json({ message: 'Unable to export organization backup.' });
    }
});

module.exports = router;
