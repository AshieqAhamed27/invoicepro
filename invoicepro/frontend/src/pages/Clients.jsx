import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // ✅ FIX 1: Correct API route
        const res = await api.get('/clients');

        // ✅ FIX 2: Ensure always array
        setClients(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-10 md:py-16">
        <div className="reveal mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
               <span className="h-px w-8 bg-emerald-400" />
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Client Directory</p>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl tracking-tight text-white mb-2">
              Clients
            </h1>
            <p className="text-lg text-zinc-500 font-medium leading-relaxed">
              A running view of the businesses and people you have billed.
            </p>
          </div>
          
          <Link to="/create-invoice" className="btn btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-yellow-500/10 font-black uppercase tracking-widest text-xs">
             Create Invoice
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {[1,2,3].map(i => (
                <div key={i} className="h-48 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
             ))}
          </div>
        ) : !Array.isArray(clients) || clients.length === 0 ? (
          <div className="premium-panel p-20 text-center">
            <h2 className="text-2xl font-black text-white mb-2">No Clients Yet</h2>
            <p className="text-zinc-500 font-medium mb-8">Start by creating your first invoice to populate your CRM.</p>
            <Link to="/create-invoice" className="btn btn-secondary py-4 px-10 rounded-2xl">Create First Invoice</Link>
          </div>
        ) : (
          <div className="reveal reveal-delay-1 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(clients) && clients.map((client) => (
              <div 
                key={client._id}
                className="group premium-panel p-8 hover:-translate-y-1 transition-all hover:border-emerald-400/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity pointer-events-none grayscale">
                   <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                   </svg>
                </div>
                
                <h3 className="text-2xl font-black text-white italic truncate mb-1">
                  {client.name || 'Anonymous'}
                </h3>

                <p className="text-sm font-bold text-emerald-400/60 lowercase tracking-tight mb-8">
                  {client.email}
                </p>

                <div className="space-y-4">
                   <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        Lifetime Billed
                      </span>
                      <span className="text-sm font-black text-white">
                        Rs {Number(client.totalInvoiced || 0).toLocaleString()}
                      </span>
                   </div>

                   <div className="flex justify-between items-center p-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        Invoices
                      </span>
                      <span className="text-sm font-black text-zinc-400">
                        {client.invoiceCount || 0} issued
                      </span>
                   </div>

                   <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Last Billed
                      </p>
                      <p className="text-xs font-bold text-zinc-500 mt-1">
                        {client.lastInvoiced
                          ? new Date(client.lastInvoiced).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'N/A'}
                      </p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
