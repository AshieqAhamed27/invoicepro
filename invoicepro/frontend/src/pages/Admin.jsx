import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/payment');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.log(err);
      alert('Failed to load requests');
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert('User upgraded to PRO ✅');
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">

        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-6">

          <h1 className="text-3xl font-bold mb-2">
            Admin Panel
          </h1>

          <p className="text-gray-400 mb-8">
            Manage payment requests and upgrade users.
          </p>

          {requests.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No payment requests yet
            </div>
          ) : (
            <div className="space-y-6">

              {requests.map((req) => (
                <div
                  key={req._id}
                  className="bg-gray-800/70 border border-gray-700 rounded-2xl p-5 shadow"
                >

                  {/* USER INFO */}
                  <div className="space-y-2">
                    <p>
                      <span className="text-gray-400">Name:</span>{' '}
                      <span className="font-semibold">{req.user?.name}</span>
                    </p>

                    <p>
                      <span className="text-gray-400">Email:</span>{' '}
                      <span className="font-semibold">{req.user?.email}</span>
                    </p>

                    <p>
                      <span className="text-gray-400">Status:</span>{' '}
                      <span
                        className={`font-semibold ${
                          req.status === 'pending'
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </p>
                  </div>

                  {/* SCREENSHOT */}
                  {req.screenshot && (
                    <div className="mt-5">
                      <p className="text-sm text-gray-400 mb-2">
                        Payment Proof
                      </p>

                      <img
                        src={`https://invoicepro-527e.onrender.com/uploads/${req.screenshot}`}
                        alt="payment proof"
                        className="w-full max-w-sm rounded-xl border border-gray-700 shadow-lg"
                      />
                    </div>
                  )}

                  {/* APPROVE BUTTON */}
                  {req.status === 'pending' && (
                    <button
                      onClick={() => approve(req._id)}
                      className="mt-5 bg-green-500 hover:bg-green-400 text-black px-5 py-3 rounded-lg font-semibold transition"
                    >
                      Approve Payment ✅
                    </button>
                  )}

                </div>
              ))}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}