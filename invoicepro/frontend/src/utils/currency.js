export const formatRs = (amount, options = {}) => {
  const { compact = false, decimals = 0 } = options;
  const value = Number(amount || 0);

  if (compact) {
    const absolute = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absolute >= 10000000) {
      return `Rs ${sign}${(absolute / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    }

    if (absolute >= 100000) {
      return `Rs ${sign}${(absolute / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }

    if (absolute >= 1000) {
      return `Rs ${sign}${(absolute / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }

    return `Rs ${sign}${absolute.toLocaleString('en-IN')}`;
  }

  return `Rs ${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};
