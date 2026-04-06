import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {

  const [requests, setRequests] = useState([]);

  // 🔐 ADMIN CHECK (FRONTEND)
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || user.email !== "ashieqahamed27@gmail.com") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-red-500 text-xl">Access Denied ❌</h1>
      </div>
    );
  }

  // 📥 FETCH REQUESTS
  const fetchRequests = async () => {
    try {
      const res = await api.get('/payment');
      setRequests(res.data.requests);
    } catch (err) {
      console.log(err);
    }
  };

  // ✅ APPROVE USER
  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert("User upgraded to PRO ✅");
      fetchRequests();
    } catch (err) {
      console.log(err);
      alert("Error approving");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-4xl mx-auto mt-8 bg-white p-6 rounded shadow">

        <h1 className="text-xl font-bold mb-4">
          Payment Requests (Admin)
        </h1>

        {requests.length === 0 && (
          <p>No requests yet</p>
        )}

        {requests.map((req) => (
          <div
            key={req._id}
            className="border p-4 mb-3 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-bold">{req.user.name}</p>
              <p className="text-sm text-gray-500">{req.user.email}</p>
              <p>Status: {req.status}</p>
            </div>

            {req.status === 'pending' && (
              <button
                onClick={() => approve(req._id)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Approve ✅
              </button>
            )}

          </div>
        ))}

      </div>
    </div>
  );
}