import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/payment/requests'); // ✅ FIXED
      setRequests(res.data || []);
    } catch (err) {
      console.log(err);
      alert('Failed to load requests');
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert('User upgraded successfully ✅');
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

      <main className="max-w-5xl mx-auto px-4 py-6">

        <h1 className="text-2xl sm:text-3xl font-bold mb-6">
          Admin Panel
        </h1>

        {requests.length === 0 ? (
          <p className="text-gray-400 text-center">
            No payment requests
          </p>
        ) : (
          <div className="space-y-4">

            {requests.map((req) => (
              <div
                key={req.id} // ✅ FIXED
                className="bg-gray-900 p-4 rounded-xl border border-gray-700"
              >

                {/* PLAN */}
                <p className="text-sm text-gray-400">
                  Plan: <span className="text-white">{req.plan}</span>
                </p>

                {/* STATUS */}
                <p className="text-sm">
                  Status:{' '}
                  <span
                    className={
                      req.status === 'pending'
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }
                  >
                    {req.status}
                  </span>
                </p>

                {/* IMAGE */}
                <img
                  src={`http://localhost:5000/uploads/${req.file}`} // ✅ FIXED
                  alt="payment"
                  className="mt-3 w-full max-w-xs rounded-lg"
                />

                {/* BUTTON */}
                {req.status === 'pending' && (
                  <button
                    onClick={() => approve(req.id)}
                    className="mt-3 w-full sm:w-auto bg-green-500 text-black px-4 py-2 rounded-lg"
                  >
                    Approve
                  </button>
                )}

              </div>
            ))}

          </div>
        )}

      </main>
    </div>
  );
}