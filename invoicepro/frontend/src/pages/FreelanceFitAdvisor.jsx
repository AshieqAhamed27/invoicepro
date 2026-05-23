import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import { trackCtaClick, trackEvent } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';

const problemOptions = [
  {
    id: 'clients',
    label: 'Finding clients',
    title: 'You need a clearer client finding routine.',
    route: '/client-finder',
    requiresPro: true,
    score: 18,
    tools: ['Client Finder', 'Lead Pipeline', 'Client Flow'],
    actions: [
      'Choose one service and one client type to target.',
      'Prepare a simple first message instead of messaging random people.',
      'Save replies into the lead pipeline.',
      'Follow up every serious lead before it goes cold.'
    ]
  },
  {
    id: 'proposal',
    label: 'Writing proposals',
    title: 'You need a faster way to turn interest into a clear offer.',
    route: '/proposal-writer',
    requiresPro: true,
    score: 16,
    tools: ['Proposal Writer', 'Deal Room', 'Client Workroom'],
    actions: [
      'Write scope, price, timeline, and next step in one place.',
      'Send a simple proposal before the client loses interest.',
      'Use validity dates so the offer does not stay open forever.',
      'Follow up with a calm close message.'
    ]
  },
  {
    id: 'delivery',
    label: 'Managing work',
    title: 'You need stronger delivery control.',
    route: '/client-workroom',
    requiresPro: false,
    score: 15,
    tools: ['Client Workroom', 'Cloud Documents', 'Team Workspace'],
    actions: [
      'Create one project workspace for the client.',
      'Write scope, milestones, and proof notes clearly.',
      'Keep files and approvals outside scattered chat messages.',
      'Invoice only after delivery proof is visible.'
    ]
  },
  {
    id: 'payment',
    label: 'Getting paid',
    title: 'You need a payment follow-up system.',
    route: '/create-invoice',
    requiresPro: false,
    score: 20,
    tools: ['Invoices', 'Payment Agent', 'Money GPS'],
    actions: [
      'Create clear invoices with due dates and payment route.',
      'Track paid, pending, and overdue money.',
      'Prepare follow-up messages before the delay becomes normal.',
      'Review pending cash every day.'
    ]
  },
  {
    id: 'growth',
    label: 'Stable monthly income',
    title: 'You need a repeatable growth plan.',
    route: '/growth-plan',
    requiresPro: true,
    score: 19,
    tools: ['Growth Plan', 'Money GPS', 'Business Autopilot'],
    actions: [
      'Set a monthly income target.',
      'Calculate how many leads and proposals are needed.',
      'Create a weekly action target.',
      'Build repeat clients and retainer offers.'
    ]
  },
  {
    id: 'technical',
    label: 'Developer delivery',
    title: 'You need technical handover and maintenance control.',
    route: '/devops-delivery',
    requiresPro: false,
    score: 14,
    tools: ['DevOps Kit', 'Cloud Documents', 'Client Workroom'],
    actions: [
      'Save GitHub, deployment, Linux/VPS, and domain details.',
      'Prepare SSL, backup, log, and rollback notes.',
      'Show clean launch proof to the client.',
      'Offer monthly maintenance after delivery.'
    ]
  }
];

const stageOptions = [
  { id: 'testing', label: 'Testing idea', score: 4, detail: 'You are still learning if the workflow fits you.' },
  { id: 'beginner', label: 'Starting freelance work', score: 12, detail: 'You need structure, but you may not need every Pro tool on day one.' },
  { id: 'active', label: 'Working with clients', score: 24, detail: 'You have real work, so missed follow-ups and unclear delivery can cost money.' },
  { id: 'busy', label: 'Too many scattered tasks', score: 28, detail: 'You need a central workflow before client work becomes messy.' }
];

const workOptions = [
  { id: 'one-invoice', label: 'One simple invoice', score: 0, detail: 'Free is likely enough right now.' },
  { id: 'few-clients', label: 'Few active clients', score: 12, detail: 'You need light workflow control.' },
  { id: 'repeat-work', label: 'Repeat client work', score: 18, detail: 'Pro starts to make sense because follow-up and tracking matter.' },
  { id: 'team-work', label: 'Team or technical projects', score: 22, detail: 'You need project, document, delivery, and payment structure.' }
];

const urgencyOptions = [
  { id: 'low', label: 'No urgent risk', score: 0 },
  { id: 'medium', label: 'Leads or proposals are slipping', score: 10 },
  { id: 'high', label: 'Money or delivery is getting delayed', score: 18 }
];

const setupOptions = [
  { id: 'self', label: 'I can set it up myself', score: 0 },
  { id: 'guided', label: 'I need some guidance', score: 8 },
  { id: 'done-for-me', label: 'I want setup help', score: 24 }
];

const optionGroups = [
  { key: 'problem', label: 'Main problem', options: problemOptions },
  { key: 'stage', label: 'Current stage', options: stageOptions },
  { key: 'workload', label: 'Workload', options: workOptions },
  { key: 'urgency', label: 'Risk level', options: urgencyOptions },
  { key: 'setup', label: 'Setup comfort', options: setupOptions }
];

const formatScore = (value) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const getOption = (options, id) => options.find((option) => option.id === id) || options[0];

const getFitResult = ({ problem, stage, workload, urgency, setup }) => {
  const selectedProblem = getOption(problemOptions, problem);
  const selectedStage = getOption(stageOptions, stage);
  const selectedWorkload = getOption(workOptions, workload);
  const selectedUrgency = getOption(urgencyOptions, urgency);
  const selectedSetup = getOption(setupOptions, setup);
  const rawScore = 18 + selectedProblem.score + selectedStage.score + selectedWorkload.score + selectedUrgency.score + selectedSetup.score;
  const score = Math.min(100, rawScore);

  if (selectedWorkload.id === 'one-invoice' && selectedStage.id === 'testing' && selectedUrgency.id === 'low') {
    return {
      score: Math.min(score, 38),
      label: 'Free is enough for now',
      plan: 'Free',
      path: '/signup',
      action: 'Create free account',
      tone: 'yellow',
      reason: 'You mainly need to test the product or create a simple invoice. Create a free account first so your workspace is saved. Do not pay until you have real client workflow pain.'
    };
  }

  if (selectedSetup.id === 'done-for-me') {
    return {
      score,
      label: 'Setup help is the best fit',
      plan: 'Agency Setup',
      path: '/agency',
      action: 'See setup help',
      tone: 'sky',
      reason: 'You want the workflow prepared for you: offer, lead plan, proposal flow, workspace, invoice, and first action plan.'
    };
  }

  if (score >= 70 || selectedStage.id === 'active' || selectedStage.id === 'busy') {
    return {
      score,
      label: 'Strong Pro fit',
      plan: 'Pro Monthly',
      path: '/payment',
      action: 'Buy Pro monthly',
      tone: 'emerald',
      reason: 'You are dealing with real client work. Pro makes sense when it helps prevent missed leads, delayed proposals, messy delivery, or pending payments.'
    };
  }

  return {
    score,
    label: 'Good free trial fit',
    plan: 'Free first',
    path: '/signup',
    action: 'Create free account',
    tone: 'yellow',
    reason: 'Create a free account, use the workflow, and upgrade only when leads, proposals, projects, and payments become active.'
  };
};

const toneClasses = {
  emerald: 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100',
  yellow: 'border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-100',
  sky: 'border-sky-300/25 bg-sky-300/[0.08] text-sky-100'
};

export default function FreelanceFitAdvisor() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [answers, setAnswers] = useState({
    problem: 'clients',
    stage: 'active',
    workload: 'few-clients',
    urgency: 'medium',
    setup: 'self'
  });

  const selectedProblem = getOption(problemOptions, answers.problem);
  const selectedStage = getOption(stageOptions, answers.stage);
  const selectedWorkload = getOption(workOptions, answers.workload);
  const result = useMemo(() => getFitResult(answers), [answers]);

  useDocumentMeta({
    title: 'Freelance Fit Advisor - ClientFlow AI',
    description: 'Check whether ClientFlow AI fits your freelance stage, client workflow, and payment problems before choosing Free, Pro, or setup help.',
    path: '/freelance-fit-advisor'
  });

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    trackEvent('freelance_fit_answer', { question: key, answer: value });
  };

  const openPath = (path, label, requiresPro = false) => {
    trackCtaClick(label, 'freelance_fit_advisor', path);

    if (path === '/signup') {
      if (loggedIn) {
        navigate('/client-flow');
        return;
      }

      setPostLoginRedirect('/client-flow');
      navigate('/signup');
      return;
    }

    if (path === '/payment') {
      localStorage.setItem('plan', 'monthly');
      if (!loggedIn) {
        setPostLoginRedirect('/payment');
        navigate('/signup');
        return;
      }
    }

    if (!loggedIn && (requiresPro || path !== '/agency')) {
      setPostLoginRedirect(path);
      navigate('/signup');
      return;
    }

    navigate(path);
  };

  const openResult = () => {
    openPath(result.path, `fit_result_${result.plan}`);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="reveal rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Freelance Fit Advisor</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Know if ClientFlow AI is useful before you pay.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Answer five quick questions. The advisor tells you whether to stay free, buy Pro, or choose setup help, then points you to the first workflow to use.
            </p>

            <div className="mt-8 grid gap-5">
              {optionGroups.map((group) => (
                <div key={group.key} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">{group.label}</h2>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                      Choose one
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {group.options.map((option) => {
                      const active = answers[group.key] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => updateAnswer(group.key, option.id)}
                          className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                            active
                              ? 'border-emerald-300/35 bg-emerald-300/[0.11] text-white'
                              : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:border-emerald-300/20 hover:text-white'
                          }`}
                        >
                          <span className="block text-sm font-black">{option.label}</span>
                          {option.detail && (
                            <span className="mt-2 block text-xs font-semibold leading-relaxed text-zinc-500">{option.detail}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="reveal reveal-delay-1 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[2rem] border border-white/8 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 sm:p-6">
              <div className={`rounded-[1.5rem] border p-5 ${toneClasses[result.tone]}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-80">{result.label}</p>
                <p className="mt-3 text-5xl font-black tracking-tight">{formatScore(result.score)}</p>
                <p className="mt-2 text-sm font-black uppercase tracking-widest">{result.plan}</p>
              </div>

              <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">{result.reason}</p>

              <button
                type="button"
                onClick={openResult}
                className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:-translate-y-0.5 hover:bg-yellow-300 active:scale-95"
              >
                {result.action}
              </button>

              <button
                type="button"
                onClick={() => openPath(selectedProblem.route, `open_${selectedProblem.id}_workflow`, selectedProblem.requiresPro)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:border-emerald-300/25 hover:bg-emerald-300/[0.08]"
              >
                Open first workflow
              </button>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Why this result</p>
                <div className="mt-3 grid gap-2 text-xs font-semibold leading-relaxed text-zinc-400">
                  <p>Main problem: <span className="text-white">{selectedProblem.label}</span></p>
                  <p>Stage: <span className="text-white">{selectedStage.label}</span></p>
                  <p>Workload: <span className="text-white">{selectedWorkload.label}</span></p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="reveal reveal-delay-2 mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Recommended first path</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{selectedProblem.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              This advisor does not promise income. It only helps choose the workflow most likely to reduce confusion and missed money actions.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedProblem.tools.map((tool) => (
                <span key={tool} className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-100">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Next actions</p>
            <div className="mt-4 grid gap-3">
              {selectedProblem.actions.map((action, index) => (
                <div key={action} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal mt-8 rounded-[2rem] border border-white/8 bg-black/20 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Free is right when', 'You only want to test the workflow or create simple invoices.'],
              ['Pro is right when', 'You are actively handling leads, proposals, client work, invoices, and payment follow-ups.'],
              ['Setup help is right when', 'You are confused and want the offer, workflow, invoice, and action plan prepared with guidance.']
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <h3 className="text-sm font-black text-white">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-black uppercase tracking-widest text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              Back to home
            </Link>
            <button
              type="button"
              onClick={() => openPath('/client-flow', 'fit_try_client_flow')}
              className="inline-flex justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-5 py-3 text-sm font-black uppercase tracking-widest text-emerald-100 transition hover:-translate-y-0.5"
            >
              Try client flow
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
