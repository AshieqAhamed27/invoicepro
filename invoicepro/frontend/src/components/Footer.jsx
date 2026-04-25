import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { SUPPORT_EMAIL } from '../utils/company';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-16 sm:py-20">
      <div className="container-custom">
        <div className="mb-16 grid grid-cols-1 gap-10 text-sm sm:grid-cols-2 md:mb-20 md:grid-cols-4 md:gap-12">
          <div className="col-span-1">
            <div className="mb-6">
              <BrandLogo showText={true} />
            </div>
            <p className="max-w-xs text-zinc-500 font-medium leading-relaxed">
              InvoicePro helps Indian service businesses send clear invoices, share public payment links,
              and manage recurring billing with more confidence.
            </p>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Explore</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <a className="transition-colors hover:text-yellow-300" href="/#trust">Why Teams Trust It</a>
              <a className="transition-colors hover:text-yellow-300" href="/#pricing">Pricing</a>
              <a className="transition-colors hover:text-yellow-300" href="/#faq">FAQ</a>
              <Link to="/blog/gst-invoice-format-india" className="transition-colors hover:text-yellow-300">
                GST Invoice Format
              </Link>
              <Link
                to="/blog/how-to-create-invoice-india"
                className="transition-colors hover:text-yellow-300"
              >
                How to Create Invoice
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/invoice-generator">
                Invoice Generator
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/contact">Contact Support</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Company</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <Link className="transition-colors hover:text-yellow-300" to="/privacy">Privacy</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/terms">Terms</Link>
              <p>Public invoice links</p>
              <p>Razorpay checkout support</p>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Contact</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-bold text-white transition-colors hover:text-yellow-300 sm:break-normal">
                {SUPPORT_EMAIL}
              </a>
              <p className="text-xs">
                Based in India.
                <br />
                Built for freelancers, agencies, and consultants.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 md:flex-row">
          <p className="text-center md:text-left">Copyright {new Date().getFullYear()} InvoicePro</p>
          <div className="mt-0 flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:justify-end">
            <Link className="transition-colors hover:text-zinc-500" to="/privacy">Privacy</Link>
            <Link className="transition-colors hover:text-zinc-500" to="/terms">Terms</Link>
            <Link className="transition-colors hover:text-zinc-500" to="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
