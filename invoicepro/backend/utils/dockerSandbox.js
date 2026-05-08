const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_OUTPUT_BYTES = 12000;
const DEFAULT_MAX_CODE_BYTES = 40000;

const isEnabled = () => String(process.env.CODE_RUNNER_ENABLED || '').toLowerCase() === 'true';

const getNumberEnv = (name, fallback, min, max) => {
    const parsed = Number(process.env[name]);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
};

const getLanguageConfig = (language = '') => {
    const normalized = String(language || '').trim().toLowerCase();
    const configs = {
        javascript: {
            language: 'javascript',
            fileName: 'main.js',
            image: process.env.CODE_RUNNER_NODE_IMAGE || 'node:20-alpine',
            command: ['node', '/workspace/main.js']
        },
        js: {
            language: 'javascript',
            fileName: 'main.js',
            image: process.env.CODE_RUNNER_NODE_IMAGE || 'node:20-alpine',
            command: ['node', '/workspace/main.js']
        },
        node: {
            language: 'javascript',
            fileName: 'main.js',
            image: process.env.CODE_RUNNER_NODE_IMAGE || 'node:20-alpine',
            command: ['node', '/workspace/main.js']
        },
        python: {
            language: 'python',
            fileName: 'main.py',
            image: process.env.CODE_RUNNER_PYTHON_IMAGE || 'python:3.12-alpine',
            command: ['python', '/workspace/main.py']
        },
        py: {
            language: 'python',
            fileName: 'main.py',
            image: process.env.CODE_RUNNER_PYTHON_IMAGE || 'python:3.12-alpine',
            command: ['python', '/workspace/main.py']
        },
        bash: {
            language: 'shell',
            fileName: 'main.sh',
            image: process.env.CODE_RUNNER_SHELL_IMAGE || 'alpine:3.20',
            command: ['sh', '/workspace/main.sh']
        },
        shell: {
            language: 'shell',
            fileName: 'main.sh',
            image: process.env.CODE_RUNNER_SHELL_IMAGE || 'alpine:3.20',
            command: ['sh', '/workspace/main.sh']
        },
        sh: {
            language: 'shell',
            fileName: 'main.sh',
            image: process.env.CODE_RUNNER_SHELL_IMAGE || 'alpine:3.20',
            command: ['sh', '/workspace/main.sh']
        }
    };

    return configs[normalized] || null;
};

const getCodeRunnerStatus = () => ({
    enabled: isEnabled(),
    mode: isEnabled() ? 'docker' : 'disabled',
    supportedLanguages: ['javascript', 'python', 'shell'],
    timeoutMs: getNumberEnv('CODE_RUNNER_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 1000, 15000),
    memory: process.env.CODE_RUNNER_MEMORY || '128m',
    cpus: process.env.CODE_RUNNER_CPUS || '0.5',
    network: 'none',
    note: isEnabled()
        ? 'Docker sandbox is enabled on this backend.'
        : 'Docker sandbox is disabled. Set CODE_RUNNER_ENABLED=true on a server with Docker access.'
});

const appendOutput = (current, chunk, maxBytes) => {
    const next = `${current}${chunk.toString('utf8')}`;
    return next.length > maxBytes ? next.slice(0, maxBytes) : next;
};

const makeRunnerError = (message, status = 400, code = 'CODE_RUNNER_ERROR') => {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
};

const runCodeInDocker = async({ code, language, stdin = '' }) => {
    if (!isEnabled()) {
        throw makeRunnerError('Docker sandbox is not enabled on this server.', 503, 'CODE_RUNNER_DISABLED');
    }

    const config = getLanguageConfig(language);
    if (!config) {
        throw makeRunnerError('This language is not supported yet. Use JavaScript, Python, or Shell.', 400, 'UNSUPPORTED_LANGUAGE');
    }

    const source = String(code || '');
    const maxCodeBytes = getNumberEnv('CODE_RUNNER_MAX_CODE_BYTES', DEFAULT_MAX_CODE_BYTES, 1000, 100000);
    if (!source.trim()) {
        throw makeRunnerError('Code is required.', 400, 'CODE_REQUIRED');
    }

    if (Buffer.byteLength(source, 'utf8') > maxCodeBytes) {
        throw makeRunnerError(`Code is too large. Limit is ${maxCodeBytes} bytes.`, 413, 'CODE_TOO_LARGE');
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `clientflow-run-${crypto.randomBytes(4).toString('hex')}-`));
    const filePath = path.join(tempDir, config.fileName);
    const timeoutMs = getNumberEnv('CODE_RUNNER_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, 1000, 15000);
    const maxOutputBytes = getNumberEnv('CODE_RUNNER_MAX_OUTPUT_BYTES', DEFAULT_MAX_OUTPUT_BYTES, 1000, 50000);
    const startedAt = Date.now();

    try {
        await fs.writeFile(filePath, source, { mode: 0o644 });

        const args = [
            'run',
            '--rm',
            '--network',
            'none',
            '--memory',
            process.env.CODE_RUNNER_MEMORY || '128m',
            '--cpus',
            process.env.CODE_RUNNER_CPUS || '0.5',
            '--pids-limit',
            process.env.CODE_RUNNER_PIDS_LIMIT || '64',
            '--read-only',
            '--cap-drop',
            'ALL',
            '--security-opt',
            'no-new-privileges',
            '--user',
            '65534:65534',
            '--workdir',
            '/workspace',
            '--tmpfs',
            '/tmp:rw,nosuid,nodev,size=16m',
            '-v',
            `${tempDir}:/workspace:ro`,
            config.image,
            ...config.command
        ];

        return await new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let settled = false;

            const child = spawn('docker', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });

            const finish = (result) => {
                if (settled) return;
                settled = true;
                resolve({
                    language: config.language,
                    image: config.image,
                    durationMs: Date.now() - startedAt,
                    stdout,
                    stderr,
                    ...result
                });
            };

            const timer = setTimeout(() => {
                timedOut = true;
                stderr = appendOutput(stderr, `\nExecution timed out after ${timeoutMs}ms.`, maxOutputBytes);
                child.kill('SIGKILL');
            }, timeoutMs);

            child.stdout.on('data', (chunk) => {
                stdout = appendOutput(stdout, chunk, maxOutputBytes);
            });

            child.stderr.on('data', (chunk) => {
                stderr = appendOutput(stderr, chunk, maxOutputBytes);
            });

            child.on('error', (err) => {
                clearTimeout(timer);
                if (err.code === 'ENOENT') {
                    reject(makeRunnerError('Docker is not available on this server.', 503, 'DOCKER_NOT_AVAILABLE'));
                    return;
                }
                reject(err);
            });

            child.on('close', (exitCode) => {
                clearTimeout(timer);
                finish({
                    status: timedOut ? 'timeout' : exitCode === 0 ? 'completed' : 'failed',
                    exitCode,
                    timedOut
                });
            });

            if (stdin) {
                child.stdin.write(String(stdin).slice(0, 5000));
            }
            child.stdin.end();
        });
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
};

module.exports = {
    getCodeRunnerStatus,
    runCodeInDocker
};
