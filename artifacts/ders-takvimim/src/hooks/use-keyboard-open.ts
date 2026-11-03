import { useEffect, useState } from 'react';

/** True when the on-screen keyboard likely covers the layout viewport (visualViewport shrank a lot). */
export function useKeyboardOpen(threshold = 140) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const gap = window.innerHeight - vv.height;
        const el = document.activeElement as HTMLElement | null;
        const editable = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
        setOpen(editable && gap > threshold);
      });
    };
    vv.addEventListener('resize', check);
    window.addEventListener('focusin', check);
    window.addEventListener('focusout', check);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', check);
      window.removeEventListener('focusin', check);
      window.removeEventListener('focusout', check);
    };
  }, [threshold]);
  return open;
}
