import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = getUser() || {};

  const plan = localStorage.getItem("userPlan");
  const isPro = plan === "monthly" || plan === "yearly";

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices || []);
    } catch {
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const totalEarned = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const pending = invoices.filter(i => i.status !== 'paid').length;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container-custom py-6 sm:py-10">

        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-8 sm:mb-10">

          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              Welcome, {user.name || "User"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Here’s your business overview
            </p>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3">

            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="btn btn-primary w-full sm:w-auto"
              >
                Upgrade
              </button>
            )}

            <Link
              to="/create-invoice"
              className="btn bg-white text-black w-full sm:w-auto text-center"
            >
              + New Invoice
            </Link>

          </div>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">

          <div className="card">
            <p className="text-sm text-gray-400">Total Revenue</p>
            <h2 className="text-xl sm:text-2xl text-green-400 mt-2">
              ₹{totalEarned.toLocaleString('en-IN')}
            </h2>
          </div>

          <div className="card">
            <p className="text-sm text-gray-400">Pending Invoices</p>
            <h2 className="text-xl sm:text-2xl text-yellow-400 mt-2">
              {pending}
            </h2>
          </div>

          <div className="card">
            <p className="text-sm text-gray-400">Total Invoices</p>
            <h2 className="text-xl sm:text-2xl mt-2">
              {invoices.length}
            </h2>
          </div>

        </div>

        {/* LIST */}
        <div className="card">

          <h2 className="text-base sm:text-lg font-medium mb-4 sm:mb-6">
            Recent Invoices
          </h2>

          {loading ? (
            <p className="text-gray-400 text-center">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-gray-400 text-center">
              No invoices yet
            </p>
          ) : (
            <div className="space-y-3">

              {invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center bg-gray-800/50 p-3 sm:p-4 rounded-xl"
                >

                  {/* LEFT */}
                  <div>
                    <p className="font-medium">
                      {inv.clientName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {inv.clientEmail}
                    </p>
                  </div>

                  {/* RIGHT */}
                  <div className="flex justify-between sm:block sm:text-right items-center">

                    <p className="text-green-400 font-semibold">
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </p>

                    <Link
                      to={`/invoice/${inv._id}`}
                      className="text-blue-400 text-sm"
                    >
                      View
                    </Link>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}