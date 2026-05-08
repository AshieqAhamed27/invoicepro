import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';

const runnableLanguages = ['javascript', 'python', 'shell'];

const statusLabel = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const initialSnippetForm = {
  title: '',
  filePath: '',
  language: 'javascript',
  code: '',
  notes: '',
  groupName: '',
  status: 'draft'
};

export default function CodeArena() {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [runnerStatus, setRunnerStatus] = useState(null);
  const [snippetForm, setSnippetForm] = useState(initialSnippetForm);
  const [sandboxInput, setSandboxInput] = useState('');
  const [snippetSaving, setSnippetSaving] = useState(false);
  const [runningSnippetId, setRunningSnippetId] = useState('');

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId) || projects[0] || null,
    [activeProjectId, projects]
  );

  const canEditActiveProject = Boolean(activeProject?.canEdit || ['owner', 'editor'].includes(activeProject?.accessRole));
  const activeGroupNames = useMemo(
    () => (activeProject?.groups || []).map((group) => group.name).filter(Boolean),
    [activeProject]
  );
  const codeSnippets = activeProject?.codeSnippets || [];
  const codeRuns = activeProject?.codeRuns || [];

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
      alert(err?.response?.data?.message || 'Failed to load Code Arena');
    } finally {
      setLoading(false);
    }
  };

  const loadRunnerStatus = async () => {
    try {
      const res = await api.get('/team-projects/code-runner/status');
      setRunnerStatus(res.data?.runner || null);
    } catch {
      setRunnerStatus({
        enabled: false,
        mode: 'unavailable',
        note: 'Code runner status is unavailable right now.'
      });
    }
  };

  useEffect(() => {
    fetchProjects();
    loadRunnerStatus();
  }, []);

  useEffect(() => {
    setSnippetForm(initialSnippetForm);
    setSandboxInput('');
  }, [activeProjectId]);

  const addCodeSnippet = async (event) => {
    event.preventDefault();

    if (!activeProject?._id || !canEditActiveProject) {
      alert('Only project owners and editors can add code snippets.');
      return;
    }

    if (!snippetForm.title.trim() || !snippetForm.code.trim()) {
      alert('Add snippet title and code first.');
      return;
    }

    try {
      setSnippetSaving(true);
      const res = await api.post(`/team-projects/${activeProject._id}/code-snippets`, snippetForm);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
      setSnippetForm(initialSnippetForm);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add code snippet.');
    } finally {
      setSnippetSaving(false);
    }
  };

  const runSnippetInSandbox = async (snippet) => {
    if (!activeProject?._id || !snippet?._id) return;

    if (!canEditActiveProject) {
      alert('Only project owners and editors can run sandbox code.');
      return;
    }

    if (!runnerStatus?.enabled) {
      alert(runnerStatus?.note || 'Docker sandbox is not enabled on this backend yet.');
      return;
    }

    try {
      setRunningSnippetId(String(snippet._id));
      const res = await api.post(`/team-projects/${activeProject._id}/code-snippets/${snippet._id}/run`, {
        language: snippet.language,
        stdin: sandboxInput
      });
      if (res.data?.runner) setRunnerStatus(res.data.runner);
      setProjects((prev) => prev.map((item) => item._id === activeProject._id ? res.data.project : item));
    } catch (err) {
      if (err?.response?.data?.runner) setRunnerStatus(err.response.data.runner);
      alert(err?.response?.data?.message || 'Docker sandbox run failed.');
    } finally {
      setRunningSnippetId('');
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
                <span className="h-px w-8 bg-sky-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Code Arena</p>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Programming workspace for freelancer teams
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                Save snippets, review code, run JavaScript/Python/Shell in Docker, and keep output visible to everyone working on the project.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/team-workspace" className="btn btn-secondary px-5 py-3 text-xs">Team Workspace</Link>
              <Link to="/os-workspaces" className="btn btn-secondary px-5 py-3 text-xs">OS Setup</Link>
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

            <div className="rounded-3xl border border-sky-300/15 bg-sky-300/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Runner</p>
              <p className="mt-2 text-lg font-black text-white">
                {runnerStatus?.enabled ? 'Docker ready' : 'Sandbox off'}
              </p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">
                {runnerStatus?.note || 'Checking Docker runner status...'}
              </p>
              <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                runnerStatus?.enabled
                  ? 'border border-emerald-300/15 bg-emerald-300/10 text-emerald-200'
                  : 'border border-amber-300/15 bg-amber-300/10 text-amber-200'
              }`}>
                {runnerStatus?.mode || 'checking'}
              </span>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Summary</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Snippets</p>
                  <p className="mt-1 text-2xl font-black text-white">{codeSnippets.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Runs</p>
                  <p className="mt-1 text-2xl font-black text-white">{codeRuns.length}</p>
                </div>
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
                  Create or join a Team Workspace project first, then come back to Code Arena.
                </p>
                <Link to="/team-workspace" className="btn btn-primary mt-5 px-5 py-3 text-xs">Open Team Workspace</Link>
              </div>
            ) : (
              <>
                {canEditActiveProject && (
                  <form onSubmit={addCodeSnippet} className="rounded-3xl border border-sky-300/15 bg-sky-300/[0.04] p-4 sm:p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Add programming snippet</p>
                    <div className="mt-4 grid gap-3">
                      <input
                        value={snippetForm.title}
                        onChange={(event) => setSnippetForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Login fix, Dockerfile, API route..."
                        className="input py-3 text-sm"
                      />
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          value={snippetForm.filePath}
                          onChange={(event) => setSnippetForm((prev) => ({ ...prev, filePath: event.target.value }))}
                          placeholder="src/App.jsx"
                          className="input py-3 text-sm lg:col-span-2"
                        />
                        <select
                          value={snippetForm.language}
                          onChange={(event) => setSnippetForm((prev) => ({ ...prev, language: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          {runnableLanguages.map((language) => (
                            <option key={language} value={language}>{statusLabel(language)}</option>
                          ))}
                        </select>
                        <select
                          value={snippetForm.status}
                          onChange={(event) => setSnippetForm((prev) => ({ ...prev, status: event.target.value }))}
                          className="input py-3 text-sm"
                        >
                          <option value="draft">Draft</option>
                          <option value="review">Review</option>
                          <option value="approved">Approved</option>
                        </select>
                      </div>
                      <select
                        value={snippetForm.groupName}
                        onChange={(event) => setSnippetForm((prev) => ({ ...prev, groupName: event.target.value }))}
                        className="input py-3 text-sm"
                      >
                        <option value="">All groups</option>
                        {activeGroupNames.map((groupName) => (
                          <option key={groupName} value={groupName}>{groupName}</option>
                        ))}
                      </select>
                      <textarea
                        value={snippetForm.code}
                        onChange={(event) => setSnippetForm((prev) => ({ ...prev, code: event.target.value }))}
                        placeholder="Paste code, config, command output, or patch here"
                        rows="10"
                        className="input min-h-[240px] resize-y py-3 font-mono text-xs"
                      />
                      <textarea
                        value={snippetForm.notes}
                        onChange={(event) => setSnippetForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="What should reviewers check?"
                        rows="3"
                        className="input min-h-[88px] resize-none py-3 text-sm"
                      />
                      <button type="submit" disabled={snippetSaving} className="btn btn-primary py-3 text-xs">
                        {snippetSaving ? 'Adding...' : 'Add Snippet'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Snippets</p>
                      <h2 className="mt-1 text-xl font-black text-white">{activeProject.title}</h2>
                    </div>
                    {canEditActiveProject && (
                      <textarea
                        value={sandboxInput}
                        onChange={(event) => setSandboxInput(event.target.value)}
                        placeholder="Optional stdin input"
                        rows="2"
                        className="input min-h-[64px] max-w-md resize-none py-3 text-sm"
                      />
                    )}
                  </div>

                  <div className="mt-5 grid gap-4">
                    {codeSnippets.length ? (
                      codeSnippets.slice().reverse().map((snippet) => {
                        const snippetLanguage = String(snippet.language || '').toLowerCase();
                        const isRunnable = runnableLanguages.includes(snippetLanguage);
                        const canRun = Boolean(runnerStatus?.enabled && isRunnable && canEditActiveProject);

                        return (
                          <div key={snippet._id || snippet.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-white">{snippet.title}</p>
                                <p className="mt-1 text-xs font-medium text-zinc-500">{snippet.filePath || snippet.language}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
                                  {snippet.language || 'code'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                                  {statusLabel(snippet.status)}
                                </span>
                              </div>
                            </div>
                            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-zinc-300">{snippet.code}</pre>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-[11px] font-semibold text-zinc-500">
                                {isRunnable ? `Runnable: ${statusLabel(snippetLanguage)}` : 'Execution supports JavaScript, Python, and Shell for now.'}
                              </p>
                              <button
                                type="button"
                                disabled={!canRun || runningSnippetId === String(snippet._id)}
                                onClick={() => runSnippetInSandbox(snippet)}
                                className="btn btn-primary px-4 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {runningSnippetId === String(snippet._id) ? 'Running...' : 'Run in Docker'}
                              </button>
                            </div>
                            {snippet.notes && (
                              <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">{snippet.notes}</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                        <p className="text-lg font-black text-white">No programming snippet yet</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
                          Add the first script, API route, config, or patch for this project.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Latest sandbox output</p>
                  {codeRuns.length ? (
                    <div className="mt-4 grid gap-3">
                      {codeRuns.slice(-5).reverse().map((run) => (
                        <div key={run._id || `${run.title}-${run.createdAt}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-black text-white">{run.title || 'Sandbox run'}</p>
                              <p className="mt-1 text-[11px] font-medium text-zinc-500">
                                {statusLabel(run.status)} - exit {run.exitCode ?? 'n/a'} - {run.durationMs || 0}ms
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                              {run.language || 'code'}
                            </span>
                          </div>
                          {run.stdout && (
                            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-emerald-200">{run.stdout}</pre>
                          )}
                          {run.stderr && (
                            <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] font-semibold leading-relaxed text-rose-200">{run.stderr}</pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">
                      Run a JavaScript, Python, or Shell snippet to save output here.
                    </p>
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
