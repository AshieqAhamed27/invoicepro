import React from 'react';
import { COMPANY_LOGO, COMPANY_SHORT_NAME } from '../utils/company';

export default function BrandLogo({ showText = true, className = '', markClassName = '', textColor = 'white' }) {
  const textClass = textColor === 'black' ? 'text-black' : 'text-white';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <img
        src={COMPANY_LOGO}
        alt={`${COMPANY_SHORT_NAME} logo`}
        className={`brand-logo-mark h-10 w-10 rounded-lg object-contain sm:h-11 sm:w-11 ${markClassName}`}
      />

      {showText && (
        <span className={`text-lg font-black tracking-tighter sm:text-xl ${textClass}`}>
          {COMPANY_SHORT_NAME}
        </span>
      )}
    </div>
  );
}
