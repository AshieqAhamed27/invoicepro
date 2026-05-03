import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollAnimator() {
  const { pathname } = useLocation();

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.scroll-reveal'));

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px'
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
