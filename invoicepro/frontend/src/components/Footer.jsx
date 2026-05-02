import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07090d]/90 pt-16 pb-28 sm:py-20">
      <div className="container-custom">
        <div className="mb-16 grid grid-cols-1 gap-10 rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm shadow-2xl shadow-black/20 sm:grid-cols-2 sm:p-8 md:mb-12 md:grid-cols-4 md:gap-12 lg:p-10">
          <div className="col-span-1">
            <div className="mb-6">
              <BrandLogo showText={true} />
            </div>
            <p className="max-w-xs text-zinc-400 font-medium leading-relaxed">
              {COMPANY_TAGLINE}
            </p>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Explore</h3>
            <div className="grid gap-4 font-medium text-zinc-400">
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
              <Link className="transition-colors hover:text-yellow-300" to="/gst-invoice-generator">
                GST Invoice Generator
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/online-invoice-maker-india">
                Online Invoice Maker
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/freelance-invoice-software">
                Freelancer Billing
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/payment-reminder-software">
                Payment Reminders
              </Link>
              <Link className="transition-colors hover:text-yellow-300" to="/contact">Contact Support</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Company</h3>
            <div className="grid gap-4 font-medium text-zinc-400">
              <Link className="transition-colors hover:text-yellow-300" to="/privacy">Privacy</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/terms">Terms</Link>
              <p>{COMPANY_LEGAL_DESCRIPTION}</p>
              <p className="break-all text-xs font-bold text-zinc-500">Udyam No: {UDYAM_REGISTRATION_NUMBER}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Contact</h3>
            <div className="grid gap-4 font-medium text-zinc-400">
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

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 md:flex-row">
          <p className="text-center md:text-left">Copyright {new Date().getFullYear()} {COMPANY_NAME}</p>
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
