import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SITE_URL } from '../utils/company';
import { isLoggedIn } from '../utils/auth';
import { getFeaturePage } from '../utils/featurePages';

export default function FeatureDetail() {
  const { featureKey } = useParams();
  const feature = getFeaturePage(featureKey);
  const loggedIn = isLoggedIn();
  const metaFeature = feature || {
    title: 'Feature',
    benefit: 'ClientFlow AI feature guide.',
    detail: 'Explore ClientFlow AI features for freelancers.',
    path: '/'
  };
  const primaryPath = feature ? (loggedIn ? feature.appPath : '/signup') : '/';
  const primaryLabel = feature ? (loggedIn ? feature.appCta : 'Create Free Account') : 'Back to Home';

  useDocumentMeta({
    title: `${metaFeature.title} | ${COMPANY_NAME}`,
    description: `${metaFeature.benefit} ${metaFeature.detail}`,
    path: metaFeature.path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `${COMPANY_NAME} ${metaFeature.title}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${SITE_URL}${metaFeature.path}`,
      description: metaFeature.detail
    }
  });

  if (!feature) return <Navigate to="/" replace />;

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-yellow-400/10 via-sky-400/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  {feature.eyebrow}
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {feature.title}
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-black leading-relaxed text-white">
                {feature.benefit}
              </p>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
                {feature.detail}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={primaryPath} className="btn btn-primary px-7 py-4 text-center text-sm">
                  {primaryLabel}
                </Link>
                <Link to="/#features" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  Back to Features
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  Work page
                </span>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Problem</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{feature.problem}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Outcome</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-200">{feature.outcome}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Understand the workflow before opening the tool.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This work page explains the job first. The real app tool opens only when the user is ready to try it.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {feature.workflow.map((step, index) => (
                <div key={step} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-300 text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                  <p className="mt-5 text-sm font-black leading-relaxed text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">What is included</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Clear workflow value, not a random dashboard button.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Best for: {feature.bestFor}
              </p>
            </div>

            <div className="grid gap-4">
              {feature.included.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <p className="text-sm font-black leading-relaxed text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black/25 py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Ready to use {feature.title}?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Start from this work page, then open the real workspace when you are ready.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={primaryPath} className="btn btn-primary px-7 py-4 text-sm">
                {primaryLabel}
              </Link>
              <Link to="/#pricing" className="btn btn-secondary px-7 py-4 text-sm">
                See Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
