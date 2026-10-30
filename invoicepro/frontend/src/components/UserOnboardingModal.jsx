import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getUser, updateUser, isLoggedIn } from '../utils/auth';

const ROLES = [
  {
    id: 'freelancer',
    title: 'Freelancer / Solo Pro',
    desc: 'Working independently with your own clients',
    icon: '💼',
    badge: 'Popular'
  },
  {
    id: 'agency',
    title: 'Agency / Studio / Team',
    desc: 'Managing client projects with team members',
    icon: '🏢'
  },
  {
    id: 'small_business',
    title: 'Small Business Owner',
    desc: 'Invoicing customers and managing cashflow',
    icon: '🏪'
  },
  {
    id: 'student',
    title: 'Student / Exploring',
    desc: 'Learning, testing, or building early portfolio',
    icon: '🎓'
  },
  {
    id: 'other',
    title: 'Other Field',
    desc: 'Consultant, creator, or different industry',
    icon: '✨'
  }
];

const EXPERIENCES = [
  {
    id: 'beginner',
    title: 'Beginner (< 1 Year)',
    desc: 'Just getting started or landed first few clients',
    icon: '🌱',
    highlight: 'Recommended tools for beginners included'
  },
  {
    id: '1_to_3_years',
    title: '1 – 3 Years Experience',
    desc: 'Established client base, regular monthly invoices',
    icon: '🚀'
  },
  {
    id: '3_to_5_years',
    title: '3 – 5 Years Experience',
    desc: 'Experienced professional managing multiple retainers',
    icon: '⭐'
  },
  {
    id: '5_plus_years',
    title: '5+ Years Veteran',
    desc: 'Seasoned expert or high-ticket consultant',
    icon: '👑'
  }
];

export default function UserOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('freelancer');
  const [selectedExperience, setSelectedExperience] = useState('beginner');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is eligible for onboarding
    const checkOnboardingEligibility = () => {
      if (!isLoggedIn()) {
        setIsOpen(false);
        return;
      }

      const user = getUser();
      if (!user || user.role === 'admin') {
        setIsOpen(false);
        return;
      }

      // Check if user already has a persona assigned
      if (user.persona && user.onboardingCompleted) {
        setIsOpen(false);
        return;
      }

      // If user postponed this session, respect their choice
      const postponed = sessionStorage.getItem('persona_onboarding_postponed');
      if (postponed === 'true') {
        setIsOpen(false);
        return;
      }

      // Eligible: show modal
      setIsOpen(true);
    };

    checkOnboardingEligibility();

    // Listen to storage events (e.g. login/logout)
    window.addEventListener('storage', checkOnboardingEligibility);
    return () => window.removeEventListener('storage', checkOnboardingEligibility);
  }, []);

  const handleSkip = () => {
    // Postpone for this browser session so old users aren't interrupted while working
    sessionStorage.setItem('persona_onboarding_postponed', 'true');
    setIsOpen(false);
  };

  const handleNextOrSubmit = async () => {
    setError('');

    // If Freelancer was chosen and we are on Step 1, move to Step 2 (Experience)
    if (selectedRole === 'freelancer' && step === 1) {
      setStep(2);
      return;
    }

    // Submit payload
    try {
      setSubmitting(true);
      const payload = {
        persona: selectedRole,
        freelanceExperience: selectedRole === 'freelancer' ? selectedExperience : ''
      };

      const res = await api.put('/auth/onboarding', payload);
      const updatedUser = res.data?.user || payload;

      // Update local storage user state
      updateUser({
        persona: updatedUser.persona || selectedRole,
        freelanceExperience: updatedUser.freelanceExperience || (selectedRole === 'freelancer' ? selectedExperience : ''),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      });

      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save onboarding:', err);
      setError(err?.response?.data?.message || 'Could not save your preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl shadow-black/80">
        
        {/* Glow Ambient Decoration */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-400/20">
                {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                10-Second Setup
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {step === 1 ? 'Who are you?' : 'How much experience do you have?'}
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-400">
              {step === 1
                ? 'Tell us what best describes your work so we can tailor templates & features for you.'
                : 'This helps us configure recommended rates, invoice reminders, and client tips.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold text-zinc-500 hover:text-white transition px-2 py-1"
            title="Skip for now"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="relative mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="relative mt-5 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-500/[0.08] shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{role.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-black transition ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                          {role.title}
                        </p>
                        {role.badge && (
                          <span className="rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.2 text-[8px] font-black uppercase tracking-wider text-emerald-300">
                            {role.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-zinc-500">{role.desc}</p>
                    </div>
                  </div>

                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-400 text-zinc-950 font-black text-xs'
                      : 'border-white/20 bg-transparent'
                  }`}>
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Experience Selection (Freelancer) */}
        {step === 2 && (
          <div className="relative mt-5 space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {EXPERIENCES.map((exp) => {
              const isSelected = selectedExperience === exp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExperience(exp.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-sky-500/60 bg-sky-500/[0.08] shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/50'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{exp.icon}</span>
                    <div>
                      <p className={`text-sm font-black transition ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                        {exp.title}
                      </p>
                      <p className="text-[11px] font-medium text-zinc-500">{exp.desc}</p>
                      {exp.highlight && isSelected && (
                        <p className="mt-1 text-[10px] font-bold text-sky-300">✨ {exp.highlight}</p>
                      )}
                    </div>
                  </div>

                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isSelected
                      ? 'border-sky-400 bg-sky-400 text-zinc-950 font-black text-xs'
                      : 'border-white/20 bg-transparent'
                  }`}>
                    {isSelected && '✓'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="relative mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNextOrSubmit}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-white px-6 py-3 text-center text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {submitting
                ? 'Saving...'
                : (step === 1 && selectedRole === 'freelancer' ? 'Continue ➔' : 'Complete Setup ✓')}
            </button>
          </div>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition underline underline-offset-4"
            >
              I will do this later (Skip)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
