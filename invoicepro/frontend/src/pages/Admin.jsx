import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/payment/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.log(err);
      alert('Failed to load requests');
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert('User upgraded successfully');
      fetchRequests();
    } catch (err) {
      console.log(err);
      alert('Error approving');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <div className="reveal mb-8">
          <p className="mb-2 text-sm font-semibold text-yellow-300">Admin</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Payment Requests
          </h1>
          <p className="mt-2 text-zinc-400">
            Review submitted screenshots and approve plan upgrades.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="surface px-5 py-12 text-center">
            <h2 className="mb-2 text-lg">No payment requests</h2>
            <p>New upgrade requests will appear here.</p>
          </div>
        ) : (
          <div className="reveal reveal-delay-1 grid gap-4 md:grid-cols-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="surface hover-lift overflow-hidden"
              >
                <div className="border-b border-white/10 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-500">Plan</p>
                      <h2 className="text-xl font-semibold capitalize">
                        {req.plan}
                      </h2>
                    </div>

                    <span className={`badge ${req.status === 'pending' ? 'badge-yellow' : 'badge-green'}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <img
                    src={`http://localhost:5000/uploads/${req.file}`}
                    alt="Payment screenshot"
                    className="mb-4 w-full rounded-lg border border-white/10 object-cover"
                  />

                  {req.status === 'pending' && (
                    <button
                      onClick={() => approve(req.id)}
                      className="btn btn-primary w-full"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
