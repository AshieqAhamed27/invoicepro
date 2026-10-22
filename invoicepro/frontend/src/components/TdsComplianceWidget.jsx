import React, { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * TdsComplianceWidget
 * India Tax & TDS Reconciliation Hub.
 * Shows TDS deducted by clients (Sections 194J & 194C),
 * Form 16A certificate tracker, and 1-click CA export for tax filing.
 */
export default function TdsComplianceWidget() {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reconcilingId, setReconcilingId] = useState(null);
  const [certInput, setCertInput] = useState('');
  const [error, setError] = useState(null);

  const fetchTdsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/invoices/tax/tds-summary');
      setSummary(res.data?.summary || null);
      setEntries(res.data?.entries || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load TDS data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTdsData();
  }, []);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleDownloadCaExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/invoices/tax/ca-export?format=csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ClientFlow-CA-Tax-Report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download CA report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReconcile = async (invoiceId) => {
    if (!certInput.trim()) return;
    try {
      await api.post(`/invoices/${invoiceId}/reconcile-tds`, {
        certificateNumber: certInput.trim()
      });
      setReconcilingId(null);
      setCertInput('');
      fetchTdsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reconcile TDS certificate.');
    }
  };

  return (
    <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl text-slate-100 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              🇮🇳 India Tax Compliance
            </span>
            <span className="text-xs text-slate-400">Section 194J & 194C</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            TDS Receivable & 26AS Reconciliation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track tax deducted by Indian B2B clients and export clean records for your Chartered Accountant
          </p>
        </div>

        <button
          onClick={handleDownloadCaExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition shadow-md shadow-teal-600/20 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : '📑 Export for CA (Tally / Excel)'}
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading tax data...</div>
      ) : error ? (
        <div className="my-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Total TDS Deducted</span>
              <div className="text-xl font-bold text-teal-400 mt-0.5">
                {formatINR(summary?.totalTdsDeducted)}
              </div>
              <span className="text-[11px] text-slate-500">Claimable on your ITR / 26AS</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Sec 194J (10% / 2%)</span>
              <div className="text-xl font-bold text-white mt-0.5">
                {formatINR(summary?.section194J)}
              </div>
              <span className="text-[11px] text-slate-500">Professional & Tech Fees</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Sec 194C (1% / 2%)</span>
              <div className="text-xl font-bold text-white mt-0.5">
                {formatINR(summary?.section194C)}
              </div>
              <span className="text-[11px] text-slate-500">Contractor Services</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-xs text-slate-400">Form 16A Audit Status</span>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {summary?.reconciledCount || 0} / {(summary?.reconciledCount || 0) + (summary?.pendingCertificateCount || 0)}
              </div>
              <span className="text-[11px] text-amber-400">
                {summary?.pendingCertificateCount || 0} pending certificates
              </span>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Gross</th>
                    <th className="py-2 px-3">TDS Section</th>
                    <th className="py-2 px-3">TDS Cut</th>
                    <th className="py-2 px-3">Form 16A Certificate</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {entries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-mono font-medium">{item.invoiceNumber}</td>
                      <td className="py-2.5 px-3">{item.clientName}</td>
                      <td className="py-2.5 px-3">{formatINR(item.amount)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-teal-300">
                          {item.tdsSection} ({item.tdsRate}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-teal-400">{formatINR(item.tdsAmount)}</td>
                      <td className="py-2.5 px-3">
                        {item.reconciled ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                            ✓ {item.certificateNumber}
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[11px]">Pending Form 16A</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {reconcilingId === item.invoiceNumber ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="text"
                              placeholder="Cert No."
                              value={certInput}
                              onChange={(e) => setCertInput(e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white w-24 focus:outline-none"
                            />
                            <button
                              onClick={() => handleReconcile(item.invoiceNumber)}
                              className="px-2 py-1 bg-emerald-600 rounded text-[11px] text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setReconcilingId(null)}
                              className="px-1 text-slate-400 text-[11px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReconcilingId(item.invoiceNumber);
                              setCertInput('');
                            }}
                            className="text-slate-400 hover:text-teal-300 text-[11px] underline"
                          >
                            {item.reconciled ? 'Edit Cert' : 'Log Cert'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
