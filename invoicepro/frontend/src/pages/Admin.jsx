import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {

  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/payment');
      setRequests(res.data.requests);
    } catch (err) {
      console.log(err);
      alert("Failed to load requests");
    }
  };

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

      <div className="max-w-4xl mx-auto p-6">

        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

        {requests.length === 0 ? (
          <p>No payment requests yet</p>
        ) : (
          <div className="space-y-4">

            {requests.map((req) => (
              <div key={req._id} className="bg-white p-4 rounded shadow">

                <p><b>Name:</b> {req.user.name}</p>
                <p><b>Email:</b> {req.user.email}</p>
                <p><b>Status:</b> {req.status}</p>

                {/* 📸 SCREENSHOT */}
                {req.screenshot && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">Payment Proof:</p>
                    <img
                      src={`https://invoicepro-527e.onrender.com/uploads/${req.screenshot}`}
                      alt="payment"
                      className="w-40 mt-2 rounded border"
                    />
                  </div>
                )}

                {/* ✅ APPROVE BUTTON */}
                {req.status === 'pending' && (
                  <button
                    onClick={() => approve(req._id)}
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Approve ✅
                  </button>
                )}

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}