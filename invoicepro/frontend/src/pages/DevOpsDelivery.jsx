import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SITE_URL } from '../utils/company';
import { isLoggedIn } from '../utils/auth';

const deliveryProblems = [
  ['Deployment is unclear', 'The client says yes, but the freelancer still needs to decide GitHub, hosting, environment variables, domain, SSL, and release process.'],
  ['Handover is weak', 'Many projects end with only a ZIP file or chat message. The client needs clear links, credentials, backup notes, and maintenance terms.'],
  ['Maintenance is not sold', 'Developers finish launch work but miss the chance to offer monthly updates, monitoring, backups, and small fixes.']
];

const deliveryWorkflow = [
  ['01', 'Project repo', 'Create or connect a GitHub repository, define branch rules, and keep client delivery history organized.'],
  ['02', 'Linux/VPS checklist', 'Plan Ubuntu/VPS basics: users, SSH, firewall, Nginx, app process, environment variables, and logs.'],
  ['03', 'Domain and SSL', 'Track domain DNS, HTTPS/SSL, redirect rules, production URL, and launch checklist.'],
  ['04', 'Deploy and verify', 'Record deployment platform, build command, health URL, rollback notes, and client approval proof.'],
  ['05', 'Backup and monitoring', 'Add backup plan, uptime checks, log review, database export, and emergency contact notes.'],
  ['06', 'Handover and retainer', 'Generate handover notes and convert support into a monthly maintenance offer.']
];

const toolkitCards = [
  {
    title: 'Linux Server Checklist',
    text: 'A beginner-friendly checklist for Ubuntu/VPS projects: SSH, firewall, Nginx, process manager, logs, SSL, and backups.'
  },
  {
    title: 'GitHub Delivery Notes',
    text: 'Keep repo link, branch, commit notes, release version, issue list, and final handover details connected to the client project.'
  },
  {
    title: 'Launch Proof',
    text: 'Save production URL, test checklist, screenshots, approval status, and payment milestone proof before final invoice.'
  },
  {
    title: 'Maintenance Offer',
    text: 'Turn completed website/app work into monthly support: updates, backups, uptime checks, bug fixes, and small improvements.'
  }
];

const fitList = [
  ['Useful for', 'Freelance developers, web designers who deploy websites, small agencies, SaaS builders, and technical consultants.'],
  ['Not needed for', 'Logo design, content writing, simple social media work, or freelancers who never deliver websites/apps.'],
  ['Positioning', 'ClientFlow AI remains a freelancer business system. DevOps Delivery Kit is an optional workflow for technical client projects.']
];

const handoverItems = [
  'Production URL and admin/login access notes',
  'GitHub repository and release summary',
  'Server, deployment, and environment variable notes',
  'Domain, SSL, DNS, and backup checklist',
  'Client approval proof and final invoice link',
  'Monthly maintenance offer and support boundary'
];

const deliveryStandards = [
  ['Scope before server work', 'Confirm runtime, domain, database, deployment target, rollback owner, and payment milestone before touching the server.'],
  ['Access control', 'Track who has SSH, hosting, domain, GitHub, database, and admin access. Remove temporary access after handover.'],
  ['Release evidence', 'Save build command, commit or tag, production URL, health check, test result, and client approval proof.'],
  ['Support boundary', 'Define what is included after launch: uptime checks, backups, updates, bug fixes, response time, and excluded new work.']
];

const linuxRunbook = [
  {
    title: 'Access and SSH',
    checks: [
      'Create a non-root sudo user for deployment',
      'Use SSH keys instead of shared passwords',
      'Record server IP, username, SSH port, and recovery owner',
      'Remove temporary access after client handover'
    ],
    commands: ['adduser deployer', 'usermod -aG sudo deployer', 'ssh deployer@server-ip']
  },
  {
    title: 'Firewall and packages',
    checks: [
      'Allow only required ports such as SSH, HTTP, and HTTPS',
      'Update OS packages before launch',
      'Record installed runtime versions',
      'Keep the firewall state in the project notes'
    ],
    commands: ['sudo apt update && sudo apt upgrade', 'sudo ufw allow OpenSSH', 'sudo ufw allow 80,443/tcp']
  },
  {
    title: 'Web server and SSL',
    checks: [
      'Configure Nginx reverse proxy or static hosting',
      'Add domain DNS and redirect rules',
      'Issue SSL certificate and test HTTPS',
      'Save production URL and certificate renewal notes'
    ],
    commands: ['sudo nginx -t', 'sudo systemctl reload nginx', 'sudo certbot --nginx']
  },
  {
    title: 'App process and logs',
    checks: [
      'Run the app with a managed process or service',
      'Store environment variables safely',
      'Know where app, Nginx, and system logs live',
      'Write restart and rollback notes for handover'
    ],
    commands: ['systemctl status app', 'journalctl -u app -n 100', 'tail -n 100 /var/log/nginx/error.log']
  },
  {
    title: 'Backup and recovery',
    checks: [
      'Define database export or snapshot schedule',
      'Record where backups are stored',
      'Test one recovery path before promising safety',
      'Add emergency contact and maintenance terms'
    ],
    commands: ['crontab -l', 'tar -czf backup.tar.gz app-folder', 'mongodump --uri="<connection-uri>"']
  }
];

const healthCheckCommand = `printf "CLIENTFLOW_LINUX_HEALTH_CHECK\\n"
printf "HOSTNAME="; hostname
printf "KERNEL="; uname -r
printf "UPTIME="; uptime -p
printf "DISK_ROOT="; df -h / | awk 'NR==2 {print $5 " used, " $4 " free"}'
printf "MEMORY="; free -h | awk '/Mem:/ {print $3 " used, " $7 " available"}'
printf "LOAD_AVERAGE="; uptime | awk -F'load average:' '{print $2}'
printf "OPEN_PORTS="; (ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null) | awk 'NR>1 {print $5}' | sed 's/.*://' | sort -n | uniq | paste -sd "," -
printf "UFW_STATUS="; sudo -n ufw status 2>/dev/null | head -n 1 || true
printf "NGINX_STATUS="; systemctl is-active nginx 2>/dev/null || true
printf "APP_PROCESSES="; ps -eo comm | grep -E "node|pm2|nginx|apache2|docker" | sort | uniq | paste -sd "," - || true
printf "SSL_CERTS="; sudo -n find /etc/letsencrypt/live -maxdepth 2 -name cert.pem 2>/dev/null | wc -l
printf "RECENT_ERRORS="; sudo -n journalctl -p 3 -n 5 --no-pager 2>/dev/null | wc -l`;

const parsePercent = (value) => {
  const match = String(value || '').match(/(\d{1,3})%/);
  return match ? Number(match[1]) : 0;
};

const parseHealthOutput = (rawOutput) => {
  const lines = String(rawOutput || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const data = {};

  lines.forEach((line) => {
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    data[key] = value;
  });

  const findings = [];
  const diskPercent = parsePercent(data.DISK_ROOT);
  const ports = String(data.OPEN_PORTS || '')
    .split(',')
    .map((port) => port.trim())
    .filter(Boolean);
  const nginxStatus = String(data.NGINX_STATUS || '').toLowerCase();
  const ufwStatus = String(data.UFW_STATUS || '').toLowerCase();
  const sslCerts = Number(data.SSL_CERTS || 0);
  const recentErrors = Number(data.RECENT_ERRORS || 0);

  if (!lines.length) {
    return {
      data,
      score: 0,
      label: 'Waiting for server output',
      findings: ['Paste health check output to create a server review.']
    };
  }

  if (!String(rawOutput).includes('CLIENTFLOW_LINUX_HEALTH_CHECK')) {
    findings.push('Output does not look like the ClientFlow AI health check format.');
  }

  if (diskPercent >= 90) findings.push('Root disk usage is very high. Free space or increase disk size before launch.');
  else if (diskPercent >= 75) findings.push('Root disk usage is getting high. Add cleanup or backup rotation.');
  else if (diskPercent > 0) findings.push('Root disk usage looks acceptable.');

  if (!ufwStatus.includes('active')) {
    findings.push('Firewall does not appear active. Confirm UFW or cloud firewall rules before handover.');
  } else {
    findings.push('Firewall appears active.');
  }

  if (ports.includes('80') || ports.includes('443')) {
    findings.push('HTTP/HTTPS ports are open for web traffic.');
  } else {
    findings.push('HTTP/HTTPS ports are not visible. Confirm the app is reachable from the public domain.');
  }

  if (nginxStatus === 'active') {
    findings.push('Nginx is active.');
  } else {
    findings.push('Nginx is not active or not installed. Confirm the reverse proxy or hosting method.');
  }

  if (sslCerts > 0) {
    findings.push('SSL certificate files were found on the server.');
  } else {
    findings.push('No LetsEncrypt certificate files found. Confirm SSL through the hosting provider or another certificate path.');
  }

  if (recentErrors > 0) {
    findings.push('Recent system errors exist. Review journalctl before final handover.');
  } else {
    findings.push('No recent critical journal errors were found by this check.');
  }

  const penalties = [
    diskPercent >= 90 ? 25 : diskPercent >= 75 ? 10 : 0,
    ufwStatus.includes('active') ? 0 : 20,
    ports.includes('80') || ports.includes('443') ? 0 : 15,
    nginxStatus === 'active' ? 0 : 10,
    sslCerts > 0 ? 0 : 15,
    recentErrors > 0 ? 10 : 0
  ];
  const score = Math.max(0, 100 - penalties.reduce((sum, value) => sum + value, 0));
  const label = score >= 85 ? 'Launch ready' : score >= 65 ? 'Needs review' : 'Fix before handover';

  return {
    data,
    score,
    label,
    findings
  };
};

export default function DevOpsDelivery() {
  const loggedIn = isLoggedIn();
  const startPath = loggedIn ? '/client-flow' : '/signup';
  const startLabel = loggedIn ? 'Open Client Flow' : 'Start Free';
  const workroomPath = loggedIn ? '/client-workroom' : '/signup';
  const workroomLabel = loggedIn ? 'Open Workroom' : 'Create Free Account';
  const [healthOutput, setHealthOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const healthReport = useMemo(() => parseHealthOutput(healthOutput), [healthOutput]);

  const copyHealthCommand = async() => {
    try {
      await navigator.clipboard.writeText(healthCheckCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  useDocumentMeta({
    title: `DevOps Delivery Kit for Freelance Developers | ${COMPANY_NAME}`,
    description: 'ClientFlow AI DevOps Delivery Kit helps freelance developers manage GitHub, Linux/VPS setup, deployments, SSL, backups, handover, and maintenance offers.',
    path: '/devops-delivery',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'DevOps Delivery Kit',
      serviceType: 'Linux, VPS, GitHub, deployment, and client handover workflow for freelancers',
      provider: {
        '@type': 'Organization',
        name: COMPANY_NAME,
        url: SITE_URL
      },
      audience: {
        '@type': 'Audience',
        audienceType: 'Freelance developers and small agencies'
      },
      areaServed: ['India', 'Worldwide'],
      url: `${SITE_URL}/devops-delivery`,
      description: 'Optional developer workflow for GitHub project delivery, Linux/VPS deployment checklists, SSL, backups, handover, and maintenance retainers.'
    }
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-400/10 via-emerald-400/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-sky-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                  Optional developer workflow
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Linux-powered project delivery for freelance developers.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                ClientFlow AI stays focused on getting clients and getting paid. This DevOps Delivery Kit is an extra workflow for technical freelancers who deliver websites, apps, servers, GitHub repos, VPS setups, and maintenance.
              </p>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Use it after a client says yes: plan the repo, deploy safely, document the server, hand over professionally, and offer monthly maintenance.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={startPath} className="btn btn-primary px-7 py-4 text-center text-sm">
                  {startLabel}
                </Link>
                <Link to="/developers" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  For Developers
                </Link>
                <Link to="/agency?workflow=devops#agency-booking" className="btn btn-dark px-7 py-4 text-center text-sm">
                  Get Setup Help
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  DevOps Kit
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {['GitHub repo ready', 'Ubuntu/VPS checklist', 'SSL and domain proof', 'Backup and handover notes'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-sm font-black text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Why this exists</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                It helps technical freelancers deliver like a professional company.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Many developers can build the project, but lose trust during deployment, documentation, handover, and maintenance. This workflow fixes that gap.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {deliveryProblems.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-6 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Developer delivery workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                From approved project to launch, handover, and maintenance.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {deliveryWorkflow.map(([step, title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">
                    {step}
                  </span>
                  <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What users get</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A practical delivery checklist, not confusing server theory.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This is not for every freelancer. It is for developers and agencies who need to show clients a clean, reliable launch and handover process.
              </p>
            </div>

            <div className="grid gap-4">
              {toolkitCards.map((card) => (
                <div key={card.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <h3 className="text-base font-black text-white">{card.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Company-grade delivery habits</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The goal is not bigger claims. The goal is cleaner delivery evidence.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                These standards help a solo developer or small agency behave more like a serious delivery team: clear access, clear release proof, clear support boundaries, and clean payment timing.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {deliveryStandards.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <h3 className="text-lg font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Linux/VPS runbook</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Practical checks a developer can follow before handover.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This keeps Linux delivery useful inside the existing ClientFlow AI workflow. Use it after proposal approval and before final invoice/payment collection.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {linuxRunbook.map((group) => (
                <article key={group.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Runbook area</p>
                      <h3 className="mt-2 text-xl font-black text-white">{group.title}</h3>
                    </div>
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">
                      Linux
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {group.checks.map((check) => (
                      <div key={check} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm font-semibold leading-relaxed text-zinc-300">
                        {check}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/80 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Useful commands to document</p>
                    <div className="mt-3 space-y-2">
                      {group.commands.map((command) => (
                        <code key={command} className="block overflow-x-auto whitespace-nowrap rounded-xl bg-black/45 px-3 py-2 text-xs font-bold text-emerald-200">
                          {command}
                        </code>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="responsive-heading-grid">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Real Linux health check</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Review a live VPS without storing SSH keys.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  Run the read-only command on the server, paste the output here, and ClientFlow AI turns it into launch and handover risks.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-sky-300/20 bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Server readiness</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black text-white">{healthReport.score}%</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-400">{healthReport.label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    Manual check
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Read-only command</p>
                    <h3 className="mt-2 text-xl font-black text-white">Linux Health Check</h3>
                  </div>
                  <button
                    type="button"
                    onClick={copyHealthCommand}
                    className="rounded-xl bg-sky-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-sky-200 active:scale-95"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="mt-5 max-h-96 overflow-auto rounded-2xl border border-white/8 bg-slate-950/90 p-4 text-xs font-bold leading-relaxed text-emerald-200">
                  {healthCheckCommand}
                </pre>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <label className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500" htmlFor="linux-health-output">
                  Server output
                </label>
                <textarea
                  id="linux-health-output"
                  value={healthOutput}
                  onChange={(event) => setHealthOutput(event.target.value)}
                  rows={13}
                  placeholder="Paste CLIENTFLOW_LINUX_HEALTH_CHECK output here..."
                  className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-semibold leading-relaxed text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-400/20"
                />

                <div className="mt-5 grid gap-3">
                  {healthReport.findings.map((finding) => (
                    <div key={finding} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm font-semibold leading-relaxed text-zinc-300">
                      {finding}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Who it is for</p>
              <div className="mt-5 grid gap-4">
                {fitList.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Handover checklist</p>
              <h2 className="mt-3 text-2xl font-black text-white">What the freelancer can prepare for the client</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {handoverItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm font-semibold leading-relaxed text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black/25 py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Add technical delivery to your client workflow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Use ClientFlow AI for the business flow, then use DevOps Delivery Kit when the project needs GitHub, Linux/VPS, domain, SSL, backup, handover, and maintenance.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={startPath} className="btn btn-primary px-7 py-4 text-sm">
                {startLabel}
              </Link>
              <Link to={workroomPath} className="btn btn-secondary px-7 py-4 text-sm">
                {workroomLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
