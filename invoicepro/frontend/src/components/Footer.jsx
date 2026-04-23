import React from 'react';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-20">
      <div className="container-custom">
        <div className="mb-20 grid grid-cols-1 gap-12 text-sm sm:grid-cols-2 md:grid-cols-4">
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
              <a className="transition-colors hover:text-yellow-300" href="mailto:ashieqahamed27@gmail.com">Contact Support</a>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Highlights</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <p>Public invoice links</p>
              <p>Recurring billing</p>
              <p>GST-ready invoice fields</p>
              <p>Razorpay checkout support</p>
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-[10px] font-black uppercase tracking-widest text-white">Contact</h3>
            <div className="grid gap-4 font-medium text-zinc-500">
              <a href="mailto:ashieqahamed27@gmail.com" className="font-bold text-white transition-colors hover:text-yellow-300">
                ashieqahamed27@gmail.com
              </a>
              <p className="text-xs">
                Based in India.
                <br />
                Built for freelancers, agencies, and consultants.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-white/5 pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 md:flex-row">
          <p>Copyright {new Date().getFullYear()} InvoicePro</p>
          <div className="mt-4 flex gap-8 md:mt-0">
            <span>Pricing shown before checkout</span>
            <span>Public payment links</span>
            <span>Support by email</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
