import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getUser } from '../utils/auth';
import { COMPANY_SHORT_NAME } from '../utils/company';

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/40 focus:bg-black/35';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500';
const panelClass = 'rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10';

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const formatMoney = (amount, currency = 'INR') => {
  const value = Number(amount || 0);
  if (currency === 'USD') return `USD ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `Rs ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const initialCreateForm = {
  name: '',
  domain: ''
};

const initialMemberForm = {
  email: '',
  role: 'member'
};

const getPermission = (organization, key) => Boolean(organization?.permissions?.[key]);

export default function OrganizationWorkspace() {
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [organization, setOrganization] = useState(null);
  const [defaults, setDefaults] = useState({});
  const [projects, setProjects] = useState([]);
  const [createForm, setCreateForm] = useState(() => ({
    ...initialCreateForm,
    name: user?.companyName || user?.name ? `${user?.companyName || user?.name} Company` : '',
    domain: user?.email?.split('@')?.[1] || ''
  }));
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [settingsForm, setSettingsForm] = useState(null);

  const roleOptions = organization?.roleOptions?.length ? organization.roleOptions : defaults.roleOptions || [];
  const billing = organization?.billing || {};
  const readiness = organization?.enterpriseReadiness || { score: 0, label: 'Foundation needed', completed: 0, total: 0, items: [] };
  const canManageOrganization = getPermission(organization, 'manageOrganization');
  const canManageMembers = getPermission(organization, 'manageMembers');
  const canManageBilling = getPermission(organization, 'manageBilling');
  const canManageSecurity = getPermission(organization, 'manageSecurity');
  const canExportAudit = getPermission(organization, 'exportAudit');
  const canExportBackup = getPermission(organization, 'exportBackup');

  const ssoDomainsText = useMemo(() => (
    Array.isArray(settingsForm?.sso?.allowedDomains)
      ? settingsForm.sso.allowedDomains.join(', ')
      : ''
  ), [settingsForm?.sso?.allowedDomains]);

  const loadOrganization = async() => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/organizations/me');
      const nextOrganization = res.data?.organization || null;
      setOrganization(nextOrganization);
      setDefaults(res.data?.defaults || {});
      setSettingsForm(nextOrganization ? {
        name: nextOrganization.name || '',
        domain: nextOrganization.domain || '',
        billing: {
          currency: nextOrganization.billing?.currency || 'INR',
          cycle: nextOrganization.billing?.cycle || 'monthly',
          seatPriceInr: nextOrganization.billing?.seatPriceInr || 299,
          seatPriceUsd: nextOrganization.billing?.seatPriceUsd || 5,
          includedSeats: nextOrganization.billing?.includedSeats || 1
        },
        security: {
          invitePolicy: nextOrganization.security?.invitePolicy || 'owners_admins',
          paymentPolicy: nextOrganization.security?.paymentPolicy || 'owners_billing',
          clientVisibility: nextOrganization.security?.clientVisibility || 'delivery_finance_admin',
          requireSso: Boolean(nextOrganization.security?.requireSso),
          enforceAllowedDomains: Boolean(nextOrganization.security?.enforceAllowedDomains)
        },
        sso: {
          enabled: Boolean(nextOrganization.sso?.enabled),
          provider: nextOrganization.sso?.provider || '',
          allowedDomains: nextOrganization.sso?.allowedDomains || [],
          tenantId: nextOrganization.sso?.tenantId || ''
        },
        retention: {
          auditLogRetentionDays: nextOrganization.retention?.auditLogRetentionDays || 365,
          dataRetentionDays: nextOrganization.retention?.dataRetentionDays || 1095,
          backupFrequency: nextOrganization.retention?.backupFrequency || 'manual',
          backupEnabled: nextOrganization.retention?.backupEnabled !== false
        }
      } : null);

      if (nextOrganization?.id) {
        const projectsRes = await api.get(`/organizations/${nextOrganization.id}/projects`);
        setProjects(projectsRes.data?.projects || []);
      } else {
        setProjects([]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not load organization workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganization();
  }, []);

  const createOrganization = async(event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving('create');

    try {
      const res = await api.post('/organizations', createForm);
      setOrganization(res.data?.organization || null);
      setMessage(res.data?.message || 'Organization workspace created.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not create organization workspace.');
    } finally {
      setSaving('');
    }
  };

  const updateSettings = async(event) => {
    event.preventDefault();
    if (!organization?.id || !settingsForm) return;

    setError('');
    setMessage('');
    setSaving('settings');

    try {
      const res = await api.patch(`/organizations/${organization.id}`, settingsForm);
      setOrganization(res.data?.organization || organization);
      setMessage(res.data?.message || 'Enterprise settings updated.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not update enterprise settings.');
    } finally {
      setSaving('');
    }
  };

  const addMember = async(event) => {
    event.preventDefault();
    if (!organization?.id) return;

    setError('');
    setMessage('');
    setSaving('member');

    try {
      const res = await api.post(`/organizations/${organization.id}/members`, memberForm);
      setOrganization(res.data?.organization || organization);
      setMemberForm(initialMemberForm);
      setMessage(res.data?.message || 'Member added.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not add member.');
    } finally {
      setSaving('');
    }
  };

  const updateMember = async(member, patch) => {
    if (!organization?.id || !member?.id) return;
    setError('');
    setMessage('');
    setSaving(member.id);

    try {
      const res = await api.patch(`/organizations/${organization.id}/members/${member.id}`, patch);
      setOrganization(res.data?.organization || organization);
      setMessage(res.data?.message || 'Member updated.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not update member.');
    } finally {
      setSaving('');
    }
  };

  const removeMember = async(member) => {
    if (!organization?.id || !member?.id) return;
    setError('');
    setMessage('');
    setSaving(member.id);

    try {
      const res = await api.delete(`/organizations/${organization.id}/members/${member.id}`);
      setOrganization(res.data?.organization || organization);
      setMessage(res.data?.message || 'Member removed.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not remove member.');
    } finally {
      setSaving('');
    }
  };

  const attachProjects = async() => {
    if (!organization?.id) return;
    setError('');
    setMessage('');
    setSaving('attach-projects');

    try {
      const res = await api.post(`/organizations/${organization.id}/attach-current-projects`);
      setMessage(res.data?.message || 'Existing workrooms attached.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not attach existing workrooms.');
    } finally {
      setSaving('');
    }
  };

  const refreshBilling = async() => {
    if (!organization?.id) return;
    setError('');
    setMessage('');
    setSaving('billing-preview');

    try {
      const res = await api.get(`/organizations/${organization.id}/billing/preview`);
      setOrganization((current) => current ? { ...current, billing: res.data?.billing || current.billing } : current);
      setMessage('Seat billing preview refreshed.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not refresh seat billing.');
    } finally {
      setSaving('');
    }
  };

  const verifySeatBilling = async(order, response = {}) => {
    const verifyRes = await api.post(`/organizations/${organization.id}/billing/verify`, {
      razorpay_order_id: response.razorpay_order_id || order.id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    });

    setOrganization(verifyRes.data?.organization || organization);
    setMessage(verifyRes.data?.message || 'Enterprise seat billing is active.');
    await loadOrganization();
  };

  const paySeatBilling = async() => {
    if (!organization?.id) return;
    setError('');
    setMessage('');
    setSaving('seat-billing-payment');

    try {
      const orderRes = await api.post(`/organizations/${organization.id}/billing/order`);
      const { keyId, order, simulation } = orderRes.data || {};
      if (!order?.id) throw new Error('Organization billing order was not created.');

      if (simulation) {
        await verifySeatBilling(order);
        setSaving('');
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay checkout failed to load. Please retry.');

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || billing.currency || 'INR',
        name: COMPANY_SHORT_NAME,
        description: `${organization.name} seat billing`,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        notes: {
          organizationId: organization.id,
          checkoutType: 'enterprise_seat_billing'
        },
        modal: {
          ondismiss: () => setSaving('')
        },
        handler: async(response) => {
          try {
            await verifySeatBilling(order, response);
          } catch (err) {
            setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not verify organization billing payment.');
          } finally {
            setSaving('');
          }
        }
      });

      checkout.open();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || err?.message || 'Could not start organization billing payment.');
      setSaving('');
    }
  };

  const downloadExport = async(path, filename) => {
    if (!organization?.id) return;
    setError('');
    setMessage('');
    setSaving(filename);

    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Export prepared.');
      await loadOrganization();
    } catch (err) {
      setError(err?.response?.data?.message || err?.friendlyMessage || 'Could not prepare export.');
    } finally {
      setSaving('');
    }
  };

  const updateNestedForm = (section, key, value) => {
    setSettingsForm((current) => ({
      ...current,
      [section]: {
        ...(current?.[section] || {}),
        [key]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={labelClass}>Enterprise workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {organization?.name || 'Company control center'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-zinc-500">
              Manage company members, seat billing, SSO access, audit exports, backup policy, and all company workrooms from one place.
            </p>
          </div>

          {organization && (
            <div className="flex flex-wrap gap-2">
              <Link to="/client-workroom" className="btn btn-secondary">Open Workrooms</Link>
              <button type="button" onClick={loadOrganization} className="btn btn-dark">Refresh</button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">
            {message}
          </div>
        )}

        {loading ? (
          <div className={panelClass}>
            <p className="text-sm font-bold text-zinc-400">Loading organization workspace...</p>
          </div>
        ) : !organization ? (
          <form onSubmit={createOrganization} className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <section className={panelClass}>
              <p className={labelClass}>Create company account</p>
              <h2 className="mt-2 text-2xl font-black text-white">Start your organization workspace</h2>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className={labelClass}>Company name</span>
                  <input
                    value={createForm.name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                    className={inputClass}
                    placeholder="ClientFlow AI Company"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className={labelClass}>Company email domain</span>
                  <input
                    value={createForm.domain}
                    onChange={(event) => setCreateForm((current) => ({ ...current, domain: event.target.value }))}
                    className={inputClass}
                    placeholder="company.com"
                  />
                </label>
                <button type="submit" disabled={saving === 'create'} className="btn btn-primary w-full sm:w-auto">
                  {saving === 'create' ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </section>

            <aside className={panelClass}>
              <p className={labelClass}>Included enterprise base</p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-zinc-400">
                {[
                  'One company owner account',
                  'Razorpay seat billing checkout',
                  'Google Workspace domain SSO setting',
                  'Microsoft company login setting',
                  'Enterprise readiness score',
                  'CSV/PDF audit export',
                  'Manual JSON backup export'
                ].map((item) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">{item}</div>
                ))}
              </div>
            </aside>
          </form>
        ) : (
          <div className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Active seats', billing.activeSeats || 0, `${billing.billableSeats || 0} billable`],
                ['Seat price', formatMoney(billing.seatPrice, billing.currency), `${billing.cycle || 'monthly'} billing`],
                ['Monthly value', formatMoney(billing.monthlyTotal, billing.currency), 'Before taxes/provider fees'],
                ['Cycle charge', formatMoney(billing.cycleTotal, billing.currency), billing.status || 'preview']
              ].map(([label, value, detail]) => (
                <div key={label} className={panelClass}>
                  <p className={labelClass}>{label}</p>
                  <p className="mt-3 text-2xl font-black text-white">{value}</p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">{detail}</p>
                </div>
              ))}
            </section>

            <section className={panelClass}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className={labelClass}>Enterprise readiness</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{readiness.label}</h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-zinc-500">
                    {readiness.completed || 0} of {readiness.total || 0} enterprise controls are complete. This tells a company what is ready before more people use the workspace.
                  </p>
                  {readiness.nextAction && (
                    <p className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm font-bold text-yellow-100">
                      Next: {readiness.nextAction.action}
                    </p>
                  )}
                </div>

                <div className="min-w-full rounded-2xl border border-white/8 bg-black/20 p-5 lg:min-w-[260px]">
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-5xl font-black text-white">{readiness.score || 0}%</p>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                      {readiness.level || 'foundation_needed'}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-emerald-300" style={{ width: `${readiness.score || 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(readiness.items || []).map((item) => (
                  <div key={item.id} className={`rounded-xl border p-4 ${
                    item.done
                      ? 'border-emerald-300/20 bg-emerald-300/[0.08]'
                      : 'border-white/8 bg-black/20'
                  }`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      item.done ? 'text-emerald-200' : 'text-zinc-600'
                    }`}>
                      {item.done ? 'Complete' : 'Needed'}
                    </p>
                    <h3 className="mt-2 text-sm font-black text-white">{item.label}</h3>
                    <p className="mt-2 text-xs font-semibold leading-6 text-zinc-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={updateSettings} className={panelClass}>
                <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={labelClass}>Company settings</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Organization, billing, SSO, security</h2>
                  </div>
                  <button type="submit" disabled={saving === 'settings'} className="btn btn-primary">
                    {saving === 'settings' ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                {settingsForm && (
                  <div className="mt-5 grid gap-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className={labelClass}>Company name</span>
                        <input
                          value={settingsForm.name}
                          disabled={!canManageOrganization}
                          onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))}
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Domain</span>
                        <input
                          value={settingsForm.domain}
                          disabled={!canManageOrganization}
                          onChange={(event) => setSettingsForm((current) => ({ ...current, domain: event.target.value }))}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <label className="grid gap-2">
                        <span className={labelClass}>Currency</span>
                        <select
                          value={settingsForm.billing.currency}
                          disabled={!canManageBilling}
                          onChange={(event) => updateNestedForm('billing', 'currency', event.target.value)}
                          className={inputClass}
                        >
                          <option value="INR">INR</option>
                          <option value="USD">USD</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Cycle</span>
                        <select
                          value={settingsForm.billing.cycle}
                          disabled={!canManageBilling}
                          onChange={(event) => updateNestedForm('billing', 'cycle', event.target.value)}
                          className={inputClass}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>INR seat</span>
                        <input
                          type="number"
                          min="0"
                          value={settingsForm.billing.seatPriceInr}
                          disabled={!canManageBilling}
                          onChange={(event) => updateNestedForm('billing', 'seatPriceInr', event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>USD seat</span>
                        <input
                          type="number"
                          min="0"
                          value={settingsForm.billing.seatPriceUsd}
                          disabled={!canManageBilling}
                          onChange={(event) => updateNestedForm('billing', 'seatPriceUsd', event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2">
                        <span className={labelClass}>Invite control</span>
                        <select
                          value={settingsForm.security.invitePolicy}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('security', 'invitePolicy', event.target.value)}
                          className={inputClass}
                        >
                          <option value="owners_admins">Owners and admins</option>
                          <option value="managers">Security and billing leads</option>
                          <option value="any_member">Any member</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Payment control</span>
                        <select
                          value={settingsForm.security.paymentPolicy}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('security', 'paymentPolicy', event.target.value)}
                          className={inputClass}
                        >
                          <option value="owners_billing">Owner and billing</option>
                          <option value="admins_billing">Admins and billing</option>
                          <option value="owner_only">Owner only</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Client visibility</span>
                        <select
                          value={settingsForm.security.clientVisibility}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('security', 'clientVisibility', event.target.value)}
                          className={inputClass}
                        >
                          <option value="all_members">All members</option>
                          <option value="delivery_finance_admin">Delivery, finance, admin</option>
                          <option value="owner_admin_only">Owner and admin only</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.5fr_0.8fr_1fr]">
                      <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-4">
                        <input
                          type="checkbox"
                          checked={settingsForm.sso.enabled}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('sso', 'enabled', event.target.checked)}
                        />
                        <span className="text-sm font-black text-white">SSO enabled</span>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>SSO provider</span>
                        <select
                          value={settingsForm.sso.provider}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('sso', 'provider', event.target.value)}
                          className={inputClass}
                        >
                          <option value="">Not selected</option>
                          <option value="google_workspace">Google Workspace</option>
                          <option value="microsoft_entra">Microsoft Entra</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Allowed domains</span>
                        <input
                          value={ssoDomainsText}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('sso', 'allowedDomains', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
                          className={inputClass}
                          placeholder="company.com, agency.com"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-4">
                        <input
                          type="checkbox"
                          checked={settingsForm.security.requireSso}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('security', 'requireSso', event.target.checked)}
                        />
                        <span className="text-sm font-black text-white">Require SSO</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-4">
                        <input
                          type="checkbox"
                          checked={settingsForm.security.enforceAllowedDomains}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('security', 'enforceAllowedDomains', event.target.checked)}
                        />
                        <span className="text-sm font-black text-white">Domain lock</span>
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Audit retention</span>
                        <input
                          type="number"
                          min="30"
                          value={settingsForm.retention.auditLogRetentionDays}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('retention', 'auditLogRetentionDays', event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className={labelClass}>Data retention</span>
                        <input
                          type="number"
                          min="90"
                          value={settingsForm.retention.dataRetentionDays}
                          disabled={!canManageSecurity}
                          onChange={(event) => updateNestedForm('retention', 'dataRetentionDays', event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </form>

              <aside className="grid gap-5">
                <section className={panelClass}>
                  <p className={labelClass}>Seat billing</p>
                  <h3 className="mt-2 text-xl font-black text-white">Per-member price preview</h3>
                  <div className="mt-5 grid gap-3 text-sm font-semibold text-zinc-400">
                    <div className="flex justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                      <span>Billable seats</span>
                      <strong className="text-white">{billing.billableSeats || 0}</strong>
                    </div>
                    <div className="flex justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                      <span>Monthly total</span>
                      <strong className="text-white">{formatMoney(billing.monthlyTotal, billing.currency)}</strong>
                    </div>
                    <div className="flex justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                      <span>Billing status</span>
                      <strong className="text-white">{billing.status || 'preview'}</strong>
                    </div>
                  </div>
                  <button type="button" onClick={refreshBilling} disabled={!canManageBilling || saving === 'billing-preview'} className="btn btn-secondary mt-5 w-full">
                    {saving === 'billing-preview' ? 'Refreshing...' : 'Refresh Billing'}
                  </button>
                  <button
                    type="button"
                    onClick={paySeatBilling}
                    disabled={!canManageBilling || saving === 'seat-billing-payment'}
                    className="btn btn-primary mt-3 w-full"
                  >
                    {saving === 'seat-billing-payment' ? 'Opening Checkout...' : 'Pay Seat Billing'}
                  </button>
                  {billing.currentPeriodEnd && (
                    <p className="mt-3 text-xs font-semibold leading-6 text-zinc-600">
                      Active until {formatDateTime(billing.currentPeriodEnd)}
                    </p>
                  )}
                </section>

                <section className={panelClass}>
                  <p className={labelClass}>Exports</p>
                  <h3 className="mt-2 text-xl font-black text-white">Audit and backup</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                      type="button"
                      disabled={!canExportAudit}
                      onClick={() => downloadExport(`/organizations/${organization.id}/audit-logs/export?format=csv`, `${organization.slug}-audit-log.csv`)}
                      className="btn btn-secondary"
                    >
                      CSV Audit
                    </button>
                    <button
                      type="button"
                      disabled={!canExportAudit}
                      onClick={() => downloadExport(`/organizations/${organization.id}/audit-logs/export?format=pdf`, `${organization.slug}-audit-log.pdf`)}
                      className="btn btn-dark"
                    >
                      PDF Audit
                    </button>
                    <button
                      type="button"
                      disabled={!canExportBackup}
                      onClick={() => downloadExport(`/organizations/${organization.id}/backup/export`, `${organization.slug}-backup.json`)}
                      className="btn btn-primary sm:col-span-2 xl:col-span-1"
                    >
                      Backup Export
                    </button>
                  </div>
                  <p className="mt-4 text-xs font-semibold leading-6 text-zinc-600">
                    Last backup: {formatDateTime(organization.retention?.lastBackupAt)}
                  </p>
                </section>
              </aside>
            </section>

            <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className={panelClass}>
                <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={labelClass}>Members</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Company access</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {organization.members?.length || 0} members
                  </span>
                </div>

                <form onSubmit={addMember} className="mt-5 grid gap-3 md:grid-cols-[1fr_0.55fr_auto]">
                  <input
                    value={memberForm.email}
                    disabled={!canManageMembers}
                    onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                    className={inputClass}
                    placeholder="member@company.com"
                    type="email"
                  />
                  <select
                    value={memberForm.role}
                    disabled={!canManageMembers}
                    onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}
                    className={inputClass}
                  >
                    {roleOptions.filter((role) => role.role !== 'owner').map((role) => (
                      <option key={role.role} value={role.role}>{role.label}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={!canManageMembers || saving === 'member'} className="btn btn-primary">
                    {saving === 'member' ? 'Adding...' : 'Add'}
                  </button>
                </form>

                <div className="mt-5 grid gap-3">
                  {(organization.members || []).map((member) => (
                    <div key={member.id || member.email} className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 md:grid-cols-[1fr_0.48fr_0.45fr_auto] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{member.name || member.email}</p>
                        <p className="truncate text-xs font-semibold text-zinc-600">{member.email}</p>
                      </div>
                      <select
                        value={member.role}
                        disabled={!canManageMembers || member.role === 'owner' || saving === member.id}
                        onChange={(event) => updateMember(member, { role: event.target.value })}
                        className={inputClass}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.role} value={role.role}>{role.label}</option>
                        ))}
                      </select>
                      <select
                        value={member.status}
                        disabled={!canManageMembers || member.role === 'owner' || saving === member.id}
                        onChange={(event) => updateMember(member, { status: event.target.value })}
                        className={inputClass}
                      >
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="disabled">Disabled</option>
                      </select>
                      <button
                        type="button"
                        disabled={!canManageMembers || member.role === 'owner' || saving === member.id}
                        onClick={() => removeMember(member)}
                        className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelClass}>
                <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={labelClass}>Company workrooms</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Projects under this organization</h2>
                  </div>
                  <button type="button" disabled={!canManageOrganization || saving === 'attach-projects'} onClick={attachProjects} className="btn btn-secondary">
                    {saving === 'attach-projects' ? 'Attaching...' : 'Attach Existing'}
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {projects.length ? projects.map((project) => (
                    <Link
                      key={project.id}
                      to="/client-workroom"
                      className="grid gap-3 rounded-xl border border-white/8 bg-black/20 p-4 transition hover:border-yellow-300/20 hover:bg-yellow-300/[0.04] md:grid-cols-[1fr_0.45fr_0.35fr] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{project.title}</p>
                        <p className="truncate text-xs font-semibold text-zinc-600">{project.clientName || 'No client name'} - {formatDateTime(project.updatedAt)}</p>
                      </div>
                      <p className="text-sm font-black text-zinc-300">{formatMoney(project.budget, project.currency)}</p>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {project.status}
                      </span>
                    </Link>
                  )) : (
                    <div className="rounded-xl border border-white/8 bg-black/20 p-5 text-sm font-semibold text-zinc-500">
                      No company workrooms attached yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {canExportAudit && (
              <section className={panelClass}>
                <p className={labelClass}>Recent audit</p>
                <h2 className="mt-2 text-2xl font-black text-white">Organization activity</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {(organization.auditLogs || []).slice(0, 12).map((log) => (
                    <div key={log.id || `${log.action}-${log.createdAt}`} className="rounded-xl border border-white/8 bg-black/20 p-4">
                      <p className="text-sm font-black text-white">{log.label || log.action}</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-600">
                        {log.actor?.email || 'system'} - {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                  {!(organization.auditLogs || []).length && (
                    <div className="rounded-xl border border-white/8 bg-black/20 p-5 text-sm font-semibold text-zinc-500">
                      No organization audit events yet.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
