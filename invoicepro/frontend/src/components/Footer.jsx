import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-20">
      <div className="container-custom">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 mb-20 text-sm">
          <div className="col-span-1 md:col-span-1">
            <div className="mb-6">
              <BrandLogo showText={true} />
            </div>
            <p className="text-zinc-500 font-medium leading-relaxed max-w-xs">
              InvoicePro helps Indian service businesses invoice clients,
              share payment links, and manage recurring billing.
            </p>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Product</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <Link className="hover:text-yellow-300 transition-colors" to="/dashboard">Dashboard</Link>
              <Link className="hover:text-yellow-300 transition-colors" to="/create-invoice">Create Invoice</Link>
              <Link className="hover:text-yellow-300 transition-colors" to="/payment">Upgrade</Link>
              <Link className="hover:text-yellow-300 transition-colors" to="/settings">Business Profile</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Resources</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <p className="hover:text-white cursor-pointer transition-colors">Getting Started</p>
              <p className="hover:text-white cursor-pointer transition-colors">Pricing</p>
              <p className="hover:text-white cursor-pointer transition-colors">Roadmap</p>
              <p className="hover:text-white cursor-pointer transition-colors">Support</p>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Contact</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <p className="hover:text-white cursor-pointer transition-colors text-white font-bold">ashieqahamed27@gmail.com</p>
              <p className="text-xs">Based in India. <br /> Built for freelancers, agencies, and consultants.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700">
          <p>© {new Date().getFullYear()} InvoicePro</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <span className="hover:text-zinc-500 cursor-pointer">Privacy</span>
            <span className="hover:text-zinc-500 cursor-pointer">Terms</span>
            <span className="hover:text-zinc-500 cursor-pointer">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
