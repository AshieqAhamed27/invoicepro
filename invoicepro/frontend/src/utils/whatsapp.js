const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i;

const getCleanPhone = (phone = '') => String(phone).replace(/\D/g, '');

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_USER_AGENT.test(navigator.userAgent || '');
};

export const getWhatsAppShareUrl = (message, phone = '') => {
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = getCleanPhone(phone);

  if (isMobileDevice()) {
    const phonePath = cleanPhone ? `/${cleanPhone}` : '';
    return `https://wa.me${phonePath}?text=${encodedMessage}`;
  }

  const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : '';
  return `https://web.whatsapp.com/send?${phoneParam}text=${encodedMessage}`;
};

export const openWhatsAppShare = (message, phone = '') => {
  if (typeof window === 'undefined') return;
  window.open(getWhatsAppShareUrl(message, phone), '_blank', 'noopener,noreferrer');
};
