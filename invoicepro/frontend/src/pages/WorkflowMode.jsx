import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackCtaClick } from '../utils/analytics';
import { isLoggedIn } from '../utils/auth';
import { workflowModes } from '../utils/workflowModes';

export default function WorkflowMode({ modeKey }) {
  const workflow = workflowModes[modeKey];
  const loggedIn = isLoggedIn();

  if (!workflow) return <Navigate to="/" replace />;

  useDocumentMeta({
    title: `${workflow.label} | ClientFlow AI`,
    description: workflow.summary,
    path: workflow.path
  });

  const appStartPath = loggedIn ? workflow.appPath : '/signup';
  const appStartLabel = loggedIn ? 'Start this workflow' : 'Create free account';
  const agencyPath = `/agency?workflow=${workflow.key}#agency-booking`;

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-400/10 via-yellow-300/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-sky-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                  {workflow.label}
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {workflow.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
                {workflow.summary}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={appStartPath}
                  onClick={() => trackCtaClick(`${workflow.key}_workflow_start`, workflow.path, appStartPath)}
                  className="btn btn-primary px-7 py-4 text-center text-sm"
                >
                  {appStartLabel}
                </Link>
                <Link
                  to={agencyPath}
                  className="btn btn-secondary px-7 py-4 text-center text-sm"
                >
                  Get agency setup
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  Clear path
                </span>
              </div>
              <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                This workflow connects existing ClientFlow AI features into one role-specific path for {workflow.audience}.
              </p>
              <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Agency setup outcome</p>
                <p className="mt-2 text-sm font-black leading-relaxed text-white">{workflow.setupOutcome}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Workflow steps</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Follow this order so the product feels simple.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-5">
              {workflow.steps.map(([title, detail, tool, path], index) => {
                const nextPath = loggedIn ? path : '/signup';

                return (
                  <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-300 text-sm font-black text-slate-950">
                      {index + 1}
                    </span>
                    <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{detail}</p>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-sky-300">{tool}</p>
                    <Link
                      to={nextPath}
                      className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                    >
                      Open step
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Want this workflow set up for you?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              ClientFlow AI Agency can set up the exact {workflow.label.toLowerCase()} with your offer, messages, proposal, project workspace, invoice, and payment flow.
            </p>
            <Link to={agencyPath} className="btn btn-primary mt-7 inline-flex px-7 py-4 text-sm">
              Book {workflow.label}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
