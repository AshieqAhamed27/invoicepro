import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollAnimator() {
  const { pathname } = useLocation();

  useEffect(() => {
    let observer;
    let mutationObserver;
    let frameId;
    let retryTimer;
    let fallbackTimer;

    const reveal = (element) => {
      element.classList.add('is-visible');
      element.removeAttribute('data-scroll-observed');
    };

    const observeElements = () => {
      const elements = Array.from(document.querySelectorAll('.scroll-reveal:not(.is-visible)'));

      if (!elements.length) return;

      if (!('IntersectionObserver' in window)) {
        elements.forEach(reveal);
        return;
      }

      if (!observer) {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                reveal(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          {
            threshold: 0.08,
            rootMargin: '0px 0px -4% 0px'
          }
        );
      }

      elements.forEach((element) => {
        if (element.getAttribute('data-scroll-observed') === 'true') return;

        const rect = element.getBoundingClientRect();
        const isAlreadyInView = rect.top < window.innerHeight * 0.96 && rect.bottom > 0;

        if (isAlreadyInView) {
          reveal(element);
          return;
        }

        element.setAttribute('data-scroll-observed', 'true');
        observer.observe(element);
      });
    };

    frameId = window.requestAnimationFrame(observeElements);
    retryTimer = window.setTimeout(observeElements, 250);
    fallbackTimer = window.setTimeout(() => {
      document.querySelectorAll('.scroll-reveal:not(.is-visible)').forEach(reveal);
    }, 1400);

    mutationObserver = new MutationObserver(observeElements);
    mutationObserver.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.clearTimeout(retryTimer);
      window.clearTimeout(fallbackTimer);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
