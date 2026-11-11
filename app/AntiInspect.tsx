'use client';

import { useEffect } from 'react';

export default function AntiInspect() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const onKey = (e: KeyboardEvent) => {
      const devKeys = ['KeyI', 'KeyJ', 'KeyC'];
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && devKeys.includes(e.code)) ||
        (e.ctrlKey && e.code === 'KeyU') ||
        (e.metaKey && e.altKey && [...devKeys, 'KeyU'].includes(e.code));
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  return null;
}