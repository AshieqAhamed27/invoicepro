import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-white/[0.02]">
      <div className="container-custom grid grid-cols-1 gap-8 py-10 text-sm text-zinc-400 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="mb-3 text-white">
            InvoicePro
          </h3>
          <p>
            Simple invoicing for freelancers and small businesses.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-white">
            Product
          </h3>
          <div className="grid gap-2">
            <Link className="hover:text-white" to="/dashboard">Dashboard</Link>
            <Link className="hover:text-white" to="/create-invoice">Create Invoice</Link>
            <Link className="hover:text-white" to="/payment">Pricing</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-white">
            Company
          </h3>
          <div className="grid gap-2">
            <p>About</p>
            <p>Contact</p>
            <p>Privacy</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-white">
            Legal
          </h3>
          <div className="grid gap-2">
            <p>Terms</p>
            <p>Privacy Policy</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
        Copyright {new Date().getFullYear()} InvoicePro. All rights reserved.
      </div>
    </footer>
  );
}
