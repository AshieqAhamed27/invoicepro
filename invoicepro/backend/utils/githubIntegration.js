const crypto = require('crypto');
const { getJwtSecret } = require('./env');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_USER_AGENT = 'ClientFlow-AI';

const cleanString = (value) => String(value || '').trim();

const getEncryptionKey = () =>
    crypto
        .createHash('sha256')
        .update(process.env.GITHUB_TOKEN_SECRET || getJwtSecret())
        .digest();

const encryptGitHubToken = (token) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(String(token), 'utf8'),
        cipher.final()
    ]);

    return {
        tokenEncrypted: encrypted.toString('base64'),
        tokenIv: iv.toString('base64'),
        tokenAuthTag: cipher.getAuthTag().toString('base64')
    };
};

const decryptGitHubToken = (github = {}) => {
    if (!github.tokenEncrypted || !github.tokenIv || !github.tokenAuthTag) {
        return '';
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getEncryptionKey(),
        Buffer.from(github.tokenIv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(github.tokenAuthTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(github.tokenEncrypted, 'base64')),
        decipher.final()
    ]).toString('utf8');
};

const getUserGitHubToken = (user) => {
    try {
        return decryptGitHubToken(user?.github || {});
    } catch {
        return '';
    }
};

const parseGitHubRepo = (value) => {
    const raw = cleanString(value).replace(/\.git$/i, '');
    if (!raw) return null;

    let owner = '';
    let name = '';

    try {
        if (/^https?:\/\//i.test(raw)) {
            const url = new URL(raw);
            if (!/github\.com$/i.test(url.hostname)) return null;
            const parts = url.pathname.split('/').filter(Boolean);
            [owner, name] = parts;
        } else {
            [owner, name] = raw.split('/').filter(Boolean);
        }
    } catch {
        return null;
    }

    const safePart = /^[A-Za-z0-9_.-]+$/;
    if (!safePart.test(owner || '') || !safePart.test(name || '')) return null;

    return {
        owner,
        name,
        fullName: `${owner}/${name}`,
        htmlUrl: `https://github.com/${owner}/${name}`
    };
};

const githubRequest = async(token, path, options = {}) => {
    if (typeof fetch !== 'function') {
        const err = new Error('GitHub sync requires Node 18 or newer.');
        err.status = 500;
        throw err;
    }

    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
        ...options,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': GITHUB_USER_AGENT,
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        const err = new Error(data?.message || 'GitHub request failed.');
        err.status = response.status;
        err.github = data;
        throw err;
    }

    return data;
};

const toRepoSummary = (repo = {}) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: Boolean(repo.private),
    htmlUrl: repo.html_url,
    description: repo.description || '',
    defaultBranch: repo.default_branch || 'main',
    language: repo.language || '',
    openIssuesCount: Number(repo.open_issues_count || 0),
    pushedAt: repo.pushed_at || null,
    updatedAt: repo.updated_at || null
});

const toIssueSummary = (issue = {}) => ({
    id: issue.id,
    number: issue.number,
    title: issue.title || '',
    state: issue.state || '',
    htmlUrl: issue.html_url || '',
    author: issue.user?.login || '',
    labels: (issue.labels || []).map((label) => label.name).filter(Boolean),
    createdAt: issue.created_at || null,
    updatedAt: issue.updated_at || null
});

const toPullSummary = (pull = {}) => ({
    id: pull.id,
    number: pull.number,
    title: pull.title || '',
    state: pull.state || '',
    htmlUrl: pull.html_url || '',
    author: pull.user?.login || '',
    head: pull.head?.ref || '',
    base: pull.base?.ref || '',
    createdAt: pull.created_at || null,
    updatedAt: pull.updated_at || null
});

const toCommitSummary = (commit = {}) => ({
    sha: String(commit.sha || '').slice(0, 12),
    message: String(commit.commit?.message || '').split('\n')[0],
    htmlUrl: commit.html_url || '',
    author: commit.commit?.author?.name || commit.author?.login || '',
    date: commit.commit?.author?.date || null
});

const toBranchSummary = (branch = {}) => ({
    name: branch.name || '',
    sha: String(branch.commit?.sha || '').slice(0, 12)
});

const fetchGitHubViewer = async(token) => {
    const viewer = await githubRequest(token, '/user');
    return {
        username: viewer.login || '',
        name: viewer.name || '',
        avatarUrl: viewer.avatar_url || '',
        htmlUrl: viewer.html_url || ''
    };
};

const fetchGitHubRepos = async(token) => {
    const repos = await githubRequest(token, '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member');
    return (Array.isArray(repos) ? repos : []).map(toRepoSummary);
};

const fetchGitHubRepoSnapshot = async(token, owner, name) => {
    const safeOwner = encodeURIComponent(owner);
    const safeName = encodeURIComponent(name);
    const base = `/repos/${safeOwner}/${safeName}`;

    const [repo, issuesRaw, pullsRaw, commitsRaw, branchesRaw] = await Promise.all([
        githubRequest(token, base),
        githubRequest(token, `${base}/issues?state=all&sort=updated&direction=desc&per_page=20`),
        githubRequest(token, `${base}/pulls?state=all&sort=updated&direction=desc&per_page=20`),
        githubRequest(token, `${base}/commits?per_page=15`),
        githubRequest(token, `${base}/branches?per_page=20`)
    ]);

    const issues = (Array.isArray(issuesRaw) ? issuesRaw : [])
        .filter((issue) => !issue.pull_request)
        .map(toIssueSummary);
    const pullRequests = (Array.isArray(pullsRaw) ? pullsRaw : []).map(toPullSummary);
    const commits = (Array.isArray(commitsRaw) ? commitsRaw : []).map(toCommitSummary);
    const branches = (Array.isArray(branchesRaw) ? branchesRaw : []).map(toBranchSummary);

    return {
        repo: toRepoSummary(repo),
        issues,
        pullRequests,
        commits,
        branches,
        counts: {
            issues: issues.length,
            openIssues: issues.filter((issue) => issue.state === 'open').length,
            pullRequests: pullRequests.length,
            openPullRequests: pullRequests.filter((pull) => pull.state === 'open').length,
            commits: commits.length,
            branches: branches.length
        },
        syncedAt: new Date().toISOString()
    };
};

module.exports = {
    encryptGitHubToken,
    fetchGitHubRepos,
    fetchGitHubRepoSnapshot,
    fetchGitHubViewer,
    getUserGitHubToken,
    parseGitHubRepo
};
