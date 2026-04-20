import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

export default function Admin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const getScreenshotUrl = (request) => {
    return request.screenshotUrl
      ? `${API_BASE_URL}${request.screenshotUrl.replace(/^\/api/, '')}`
      : `${API_BASE_URL}/payment/requests/${request._id}/screenshot`;
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payment/requests');
      setRequests(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.put(`/payment/approve/${id}`);
      alert('Plan upgraded successfully');
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

      <main className="container-custom py-10 md:py-16">
        <div className="reveal mb-12">
          <div className="flex items-center gap-2 mb-4">
             <span className="h-px w-8 bg-red-500" />
             <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Security & Permissions</p>
          </div>
          <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-4">
            Payment Audit
          </h1>
          <p className="max-w-2xl text-lg text-zinc-500 font-medium leading-relaxed">
            Verify manual payment evidence and provision premium access.
          </p>
        </div>

        {loading ? (
           <div className="grid gap-6 md:grid-cols-2">
              {[1,2].map(i => (
                <div key={i} className="h-96 rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse" />
              ))}
           </div>
        ) : requests.length === 0 ? (
          <div className="surface p-20 text-center border-white/5 bg-zinc-950/40 rounded-[2.5rem]">
            <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 text-zinc-700">
               <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">No Pending Actions</h2>
            <p className="text-zinc-500 font-medium">All upgrade requests have been processed.</p>
          </div>
        ) : (
          <div className="reveal reveal-delay-1 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <div
                key={req._id}
                className="group surface border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.02] hover:border-white/10 shadow-2xl"
              >
                <div className="border-b border-white/5 p-8 bg-white/[0.01]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Requested Logic</p>
                      <h2 className="text-2xl font-black text-white capitalize tracking-tighter italic">
                        {req.plan} Pro
                      </h2>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'pending' ? 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10' : 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${req.status === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-400'}`} />
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="relative mb-8 aspect-video rounded-2xl border border-white/5 overflow-hidden group/img">
                    <img
                      src={getScreenshotUrl(req)}
                      alt="Payment screenshot"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-4">
                       <a 
                         href={getScreenshotUrl(req)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="px-6 py-2 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest"
                       >
                         View Full Resolution
                       </a>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <button
                      onClick={() => approve(req._id)}
                      className="btn btn-primary w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/20 active:scale-95 transition-all"
                    >
                      Authorize Upgrade
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
