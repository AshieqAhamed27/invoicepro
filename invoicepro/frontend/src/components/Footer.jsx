import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-16">

      <div className="container-custom py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-400">

        {/* BRAND */}
        <div>
          <h3 className="text-white font-semibold mb-3">
            InvoicePro
          </h3>
          <p>
            Simple invoicing for freelancers & small businesses.
          </p>
        </div>

        {/* PRODUCT */}
        <div>
          <h3 className="text-white font-semibold mb-3">
            Product
          </h3>
          <div className="space-y-2">
            <Link to="/dashboard">Dashboard</Link><br />
            <Link to="/create-invoice">Create Invoice</Link><br />
            <Link to="/payment">Pricing</Link>
          </div>
        </div>

        {/* COMPANY */}
        <div>
          <h3 className="text-white font-semibold mb-3">
            Company
          </h3>
          <div className="space-y-2">
            <p>About</p>
            <p>Contact</p>
            <p>Privacy</p>
          </div>
        </div>

        {/* LEGAL */}
        <div>
          <h3 className="text-white font-semibold mb-3">
            Legal
          </h3>
          <div className="space-y-2">
            <p>Terms</p>
            <p>Privacy Policy</p>
          </div>
        </div>

      </div>

      {/* BOTTOM */}
      <div className="text-center text-gray-500 text-xs py-6 border-t border-gray-800">
        © {new Date().getFullYear()} InvoicePro. All rights reserved.
      </div>

    </footer>
  );
}