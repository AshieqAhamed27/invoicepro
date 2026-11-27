import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import useDocumentMeta from '../utils/useDocumentMeta';

const categories = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'contract', label: 'Contract' },
  { value: 'project', label: 'Project' },
  { value: 'client', label: 'Client' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' }
];

const categoryLabel = (value) =>
  categories.find((category) => category.value === value)?.label || 'Other';

const formatBytes = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CloudDocuments() {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'project',
    note: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useDocumentMeta({
    title: 'Cloud Documents | ClientFlow AI',
    description: 'Upload and manage invoices, proposals, contracts, and client files in ClientFlow AI cloud storage.'
  });

  const totalStorage = useMemo(
    () => documents.reduce((sum, document) => sum + Number(document.bytes || 0), 0),
    [documents]
  );

  const loadDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const [statusRes, docsRes] = await Promise.all([
        api.get('/cloud-documents/status'),
        api.get('/cloud-documents')
      ]);
      setStatus(statusRes.data || null);
      setDocuments(docsRes.data?.documents || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not load cloud documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile && !form.title) {
      setForm((prev) => ({
        ...prev,
        title: selectedFile.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!file) {
      setError('Choose a PDF or image file first.');
      return;
    }

    if (!form.title.trim()) {
      setError('Add a title for this document.');
      return;
    }

    try {
      setUploading(true);
      const payload = new FormData();
      payload.append('file', file);
      payload.append('title', form.title.trim());
      payload.append('category', form.category);
      payload.append('note', form.note.trim());

      const res = await api.post('/cloud-documents', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setDocuments((prev) => [res.data.document, ...prev]);
      setMessage('Document uploaded successfully.');
      setForm({ title: '', category: 'project', note: '' });
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId) => {
    const ok = window.confirm('Delete this cloud document?');
    if (!ok) return;

    try {
      await api.delete(`/cloud-documents/${documentId}`);
      setDocuments((prev) => prev.filter((document) => document._id !== documentId));
      setMessage('Document deleted.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not delete document.');
    }
  };

  return (
    <div className="premium-page min-h-screen">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">
                Cloud storage
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Keep client documents in one cloud workspace.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
              Upload invoices, proposals, contracts, project files, delivery files, and client documents. Each file gets a secure cloud link you can open later.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-black/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Storage summary</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{documents.length}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">documents saved</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">{formatBytes(totalStorage)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">uploaded in this workspace</p>
            </div>
          </div>
        </section>

        {!status?.configured && !loading && (
          <section className="mb-8 rounded-[1.5rem] border border-amber-200 bg-yellow-300/[0.07] p-5">
            <p className="text-sm font-semibold leading-relaxed text-amber-700">
              Cloudinary is not configured on this backend. Add Cloudinary environment variables and restart the backend.
            </p>
          </section>
        )}

        {(message || error) && (
          <section className={`mb-8 rounded-2xl border p-4 ${
            error
              ? 'border-rose-200 bg-red-300/[0.08] text-rose-700'
              : 'border-emerald-200 bg-emerald-300/[0.08] text-emerald-700'
          }`}>
            <p className="text-sm font-bold">{error || message}</p>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.68fr)_minmax(0,1fr)]">
          <form onSubmit={handleUpload} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Upload file</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Add cloud document</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
              Allowed files: PDF, JPG, PNG, WEBP, SVG. Maximum size: 10MB.
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">File</span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-300 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-slate-950 focus:border-yellow-300/50"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Example: Website proposal"
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Category</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition cursor-pointer"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Note</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Short context for this file"
                  rows="4"
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition resize-none"
                />
              </label>
              <button type="submit" disabled={uploading || !status?.configured} className="btn btn-primary py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                {uploading ? 'Uploading...' : 'Upload To Cloud'}
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">Files</p>
                <h2 className="mt-3 text-2xl font-black text-slate-900">Cloud document library</h2>
              </div>
              <button
                type="button"
                onClick={loadDocuments}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 transition hover:bg-slate-100"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {loading && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
                  Loading documents...
                </div>
              )}

              {!loading && documents.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-lg font-black text-slate-900">No cloud documents yet.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Upload your first invoice, proposal, contract, or delivery file.
                  </p>
                </div>
              )}

              {documents.map((document) => (
                <article key={document._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-slate-50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700">
                          {categoryLabel(document.category)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{formatDate(document.createdAt)}</span>
                      </div>
                      <h3 className="mt-3 break-words text-lg font-black text-slate-900">{document.title}</h3>
                      <p className="mt-1 break-words text-xs font-semibold text-slate-600">{document.originalName}</p>
                      {document.note && (
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{document.note}</p>
                      )}
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {document.mimeType || 'file'} | {formatBytes(document.bytes)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={document.secureUrl || document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteDocument(document._id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
