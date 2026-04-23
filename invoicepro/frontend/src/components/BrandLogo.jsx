import React from 'react';

export default function BrandLogo({ showText = true, className = '', markClassName = '', textColor = 'white' }) {
  const textClass = textColor === 'black' ? 'text-black' : 'text-white';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <svg
        className={`brand-logo-mark h-10 w-10 sm:h-11 sm:w-11 ${markClassName}`}
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        role="img"
        aria-label="InvoicePro logo"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="44" height="44" rx="8" fill="#FACC15" />
        <path
          d="M14 9.5H27.2L34 16.3V34.5H14V9.5Z"
          fill="#050505"
          stroke="#050505"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M27.2 9.5V16.3H34"
          stroke="#FACC15"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="brand-logo-line"
          d="M18.5 20H29.5"
          stroke="#FACC15"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="brand-logo-line brand-logo-line-delay"
          d="M18.5 25H27"
          stroke="#FACC15"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18.5 30L21.1 32.4L26.2 27.2"
          stroke="#22C55E"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className={`text-lg font-black tracking-tighter sm:text-xl ${textClass}`}>
          InvoicePro
        </span>
      )}
    </div>
  );
}
