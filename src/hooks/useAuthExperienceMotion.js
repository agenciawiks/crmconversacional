import { useEffect, useLayoutEffect } from 'react';
import { gsap } from 'gsap';

export function useAuthExperienceMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const context = gsap.context(() => {
      const stage = root.querySelector('.auth-stage');
      const reveals = root.querySelectorAll('.auth-reveal');
      const panel = root.querySelector('.auth-panel');
      const actions = root.querySelectorAll('.auth-field, .auth-action-reveal');
      const signalBars = root.querySelectorAll('.auth-signal-bar');
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline.from(stage, { autoAlpha: 0, scale: 0.985, duration: 0.55 });

      if (reveals.length) {
        timeline.from(reveals, { autoAlpha: 0, y: 20, duration: 0.52, stagger: 0.075 }, '-=0.3');
      }

      if (panel) {
        timeline.from(panel, { autoAlpha: 0, x: 24, duration: 0.58 }, '-=0.55');
      }

      if (actions.length) {
        timeline.from(actions, { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.055 }, '-=0.3');
      }

      gsap.to('.auth-orb--one', {
        x: 38,
        y: 25,
        scale: 1.09,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.auth-orb--two', {
        x: -30,
        y: -22,
        scale: 1.12,
        duration: 9.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      if (signalBars.length) {
        gsap.to(signalBars, {
          scaleY: 1.45,
          duration: 0.7,
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.12, repeat: -1, yoyo: true },
          ease: 'sine.inOut',
          transformOrigin: 'bottom',
        });
      }
    }, root);

    return () => context.revert();
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.auth-cursor-glow');
    if (!root || !glow) return undefined;

    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });

    const handlePointerMove = (event) => {
      moveX(event.clientX);
      moveY(event.clientY);
    };

    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => root.removeEventListener('pointermove', handlePointerMove);
  }, [rootRef]);
}
