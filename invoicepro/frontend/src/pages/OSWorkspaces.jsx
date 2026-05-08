import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const codeOsOptions = ['linux', 'windows', 'macos', 'android', 'ios', 'server', 'other'];

const statusLabel = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const initialEnvironmentForm = {
  name: '',
  os: 'linux',
  runtime: '',
  repositoryUrl: '',
  branch: '',
  setupCommands: '',
  runCommands: '',
  testCommands: '',
  notes: '',
  groupName: ''
};

export default function OSWorkspaces() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [environmentSaving, setEnvironmentSaving] = useState(false);
  const [environmentForm, setEnvironmentForm] = useState(initialEnvironmentForm);

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId) || projects[0] || null,
    [activeProjectId, projects]
  );

  const canEditActiveProject = Boolean(activeProject?.canEdit || ['owner', 'editor'].includes(activeProject?.accessRole));
  const activeGroupNames = useMemo(
    () => (activeProject?.groups || []).map((group) => group.name).filter(Boolean),
    [activeProject]
  );
  const codeEnvironments = activeProject?.codeEnvironments || [];

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/team-projects');
      const nextProjects = res.data?.projects || [];
      setProjects(nextProjects);
      if (!activeProjectId && nextProjects[0]?._id) {
        setActiveProjectId(nextProjects[0]._id);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to load OS workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    setEnvironmentForm(initialEnvironmentForm);
  }, [activeProjectId]);

  const addCodeEnvironment = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add OS workspaces.');
      return;
    }

    if (!environmentForm.name.trim()) {
      alert('Add an environment name first.');
      return;
    }

    try {
      setEnvironmentSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/code-environments`, environmentForm);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
      setEnvironmentForm(initialEnvironmentForm);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add OS workspace.');
    } finally {
      setEnvironmentSaving(false);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-8 bg-emerald-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">OS / Environment</p>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                OS setup page for project delivery
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                Keep Linux, Windows, macOS, Android, iOS, and server setup instructions separate from coding so every freelancer knows exactly how to start.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/team-workspace" className="btn btn-secondary px-5 py-3 text-xs">Team Workspace</Link>
              <Link to="/code-arena" className="btn btn-secondary px-5 py-3 text-xs">Code Arena</Link>
            </div>
          </div>
        </section>

        <section className="reveal reveal-delay-1 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Project</p>
              <select
                value={activeProject?._id || ''}
                onChange={(event) => setActiveProjectId(event.target.value)}
                className="input mt-3 py-3 text-sm"
              >
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>{project.title}</option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Workspace count</p>
              <p className="mt-2 text-3xl font-black text-white">{codeEnvironments.length}</p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                Environments saved for the selected project.
              </p>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Supported OS</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {codeOsOptions.map((os) => (
                  <span key={os} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                    {statusLabel(os)}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {loading ? (
              <div className="premium-panel p-8">
                <div className="h-6 w-48 animate-pulse rounded-full bg-white/5" />
                <div className="mt-5 h-48 animate-pulse rounded-3xl bg-white/5" />
              </div>
            ) : !activeProject ? (
              <div className="premium-panel p-8 text-center">
                <h2 className="text-3xl font-black text-white">No team project found</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">
                  Create or join a Team Workspace project first, then add OS setup instructions.
                </p>
                <Link to="/team-workspace" className="btn btn-primary mt-5 px-5 py-3 text-xs">Open Team Workspace</Link>
              </div>
            ) : (
              <>
                {canEditActiveProject && (
                  <form onSubmit={addCodeEnvironment} className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Add OS workspace</p>
                    <div className="mt-4 grid gap-3">
                      <input
                        value={environmentForm.name}
                        onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Linux backend, Android app, Windows desktop..."
                        className="input py-3 text-sm"
                      />
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <select
                          value={environmentForm.os}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, os: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          {codeOsOptions.map((os) => (
                            <option key={os} value={os}>{statusLabel(os)}</option>
                          ))}
                        </select>
                        <input
                          value={environmentForm.runtime}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, runtime: event.target.value }))}
                          placeholder="Node 20, Python 3.12, Java..."
                          className="input py-3 text-sm"
                        />
                        <input
                          value={environmentForm.branch}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, branch: event.target.value }))}
                          placeholder="Branch"
                          className="input py-3 text-sm"
                        />
                        <select
                          value={environmentForm.groupName}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, groupName: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          <option value="">All groups</option>
                          {activeGroupNames.map((groupName) => (
                            <option key={groupName} value={groupName}>{groupName}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={environmentForm.repositoryUrl}
                        onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, repositoryUrl: event.target.value }))}
                        placeholder="Repository URL"
                        className="input py-3 text-sm"
                      />
                      <div className="grid gap-3 lg:grid-cols-3">
                        <textarea
                          value={environmentForm.setupCommands}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, setupCommands: event.target.value }))}
                          placeholder="Setup commands, one per line"
                          rows="6"
                          className="input min-h-[150px] resize-y py-3 font-mono text-xs"
                        />
                        <textarea
                          value={environmentForm.runCommands}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, runCommands: event.target.value }))}
                          placeholder="Run commands, one per line"
                          rows="6"
                          className="input min-h-[150px] resize-y py-3 font-mono text-xs"
                        />
                        <textarea
                          value={environmentForm.testCommands}
                          onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, testCommands: event.target.value }))}
                          placeholder="Test commands, one per line"
                          rows="6"
                          className="input min-h-[150px] resize-y py-3 font-mono text-xs"
                        />
                      </div>
                      <textarea
                        value={environmentForm.notes}
                        onChange={(event) => setEnvironmentForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="OS notes, secrets needed, output expectation..."
                        rows="3"
                        className="input min-h-[88px] resize-none py-3 text-sm"
                      />
                      <button type="submit" disabled={environmentSaving} className="btn btn-primary py-3 text-xs">
                        {environmentSaving ? 'Adding...' : 'Add Workspace'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Saved environments</p>
                    <h2 className="mt-1 text-xl font-black text-white">{activeProject.title}</h2>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {codeEnvironments.length ? (
                      codeEnvironments.map((environment) => (
                        <div key={environment._id || environment.name} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-black text-white">{environment.name}</p>
                              <p className="mt-1 text-xs font-medium text-zinc-500">
                                {statusLabel(environment.os)} {environment.runtime ? `- ${environment.runtime}` : ''} {environment.branch ? `- ${environment.branch}` : ''}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                              {environment.groupName || 'All team'}
                            </span>
                          </div>
                          {environment.repositoryUrl && (
                            <p className="mt-3 break-all text-xs font-medium text-zinc-400">{environment.repositoryUrl}</p>
                          )}
                          <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            {[
                              ['Setup', environment.setupCommands],
                              ['Run', environment.runCommands],
                              ['Test', environment.testCommands]
                            ].map(([label, commands]) => (
                              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                                {commands?.length ? (
                                  <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words text-[11px] font-semibold leading-relaxed text-zinc-300">{commands.join('\n')}</pre>
                                ) : (
                                  <p className="text-[11px] font-medium text-zinc-600">Not added</p>
                                )}
                              </div>
                            ))}
                          </div>
                          {environment.notes && (
                            <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">{environment.notes}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                        <p className="text-lg font-black text-white">No OS workspace yet</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                          Add Linux/server setup for backend work or Android/iOS setup for app projects.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
