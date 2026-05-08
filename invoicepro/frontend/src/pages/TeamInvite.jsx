import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';

const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const roleCopy = {
  editor: 'You can update project tasks, generate AI delivery plans, and send group chat messages.',
  viewer: 'You can view your project work and send group chat messages.'
};

export default function TeamInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useDocumentMeta(
    'Team Invite | ClientFlow AI',
    'Accept a ClientFlow AI team workspace invite and join a freelancer project room.'
  );

  useEffect(() => {
    const loadInvite = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/team-projects/invites/${token}`);
        setInvite(res.data?.invite || null);
        setProject(res.data?.project || null);
      } catch (err) {
        setError(err?.response?.data?.message || 'Invite link is invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const prepareAuthRedirect = () => {
    setPostLoginRedirect(`/team-invite/${token}`);
  };

  const acceptInvite = async () => {
    if (!isLoggedIn()) {
      prepareAuthRedirect();
      navigate('/signup');
      return;
    }

    try {
      setAccepting(true);
      await api.post(`/team-projects/invites/${token}/accept`);
      navigate('/team-workspace', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom flex min-h-[calc(100vh-120px)] items-center py-10">
        <section className="mx-auto w-full max-w-3xl">
          <div className="premium-panel p-6 sm:p-10">
            {loading ? (
              <div className="space-y-4">
                <div className="h-5 w-40 animate-pulse rounded-full bg-white/5" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
                <div className="h-32 w-full animate-pulse rounded-3xl bg-white/5" />
              </div>
            ) : error ? (
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Invite unavailable</p>
                <h1 className="mt-3 text-3xl font-black text-white">This invite cannot be opened</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-zinc-500">{error}</p>
                <Link to="/" className="btn btn-primary mt-8 inline-flex px-6 py-4">
                  Go Home
                </Link>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Freelancer team invite</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Join {project?.title || 'this project'}
                </h1>
                <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                  {project?.ownerName || 'A project owner'} invited you to collaborate in ClientFlow AI.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client</p>
                    <p className="mt-2 text-lg font-black text-white">{project?.clientName || 'Not set'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Deadline</p>
                    <p className="mt-2 text-lg font-black text-white">{formatDate(project?.deadline)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Your role</p>
                    <p className="mt-2 text-lg font-black text-white">{invite?.role === 'editor' ? 'Editor' : 'Viewer'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Group</p>
                    <p className="mt-2 text-lg font-black text-white">{invite?.groupName || 'All project'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-sky-400/15 bg-sky-400/[0.04] p-5">
                  <p className="text-sm font-semibold leading-relaxed text-sky-100">
                    {roleCopy[invite?.role] || roleCopy.viewer}
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={acceptInvite}
                    disabled={accepting}
                    className="btn btn-primary flex-1 py-5 text-base"
                  >
                    {accepting ? 'Joining...' : isLoggedIn() ? 'Accept Invite' : 'Create Account & Join'}
                  </button>
                  {!isLoggedIn() && (
                    <Link
                      to="/login"
                      onClick={prepareAuthRedirect}
                      className="btn btn-secondary flex-1 py-5 text-center text-base"
                    >
                      Login & Join
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
