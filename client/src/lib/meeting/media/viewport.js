// Phase A spec §5.2/§6.2. Reports which remote producers are actually
// rendered, and at what width in device pixels (CSS px × devicePixelRatio —
// using CSS px would under-select the layer on a retina display). Throttled
// to 250ms and coalesced, per spec §4.2.
//
// A1 reports plain visibility only (no prefetch/pinning yet — paging and
// manual pin are layout-switcher concerns, Milestone A2); that's enough to
// exercise the real server-side consumer diff end to end.

export function createViewportTracker({ onChange, threshold = 0.4, throttleMs = 250 }) {
  const visible = new Map(); // producerId -> width (device px)
  let observer = null;
  let timer = null;

  function flush() {
    timer = null;
    onChange({
      visible: [...visible.entries()].map(([producerId, width]) => ({ producerId, width })),
    });
  }

  function schedule() {
    if (timer) return;
    timer = setTimeout(flush, throttleMs);
  }

  function ensureObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const producerId = entry.target.dataset.producerId;
          if (!producerId) continue;
          if (entry.isIntersecting) {
            const dpr = window.devicePixelRatio || 1;
            visible.set(producerId, Math.round(entry.target.clientWidth * dpr));
          } else {
            visible.delete(producerId);
          }
        }
        schedule();
      },
      { threshold },
    );
    return observer;
  }

  return {
    observe(el, producerId) {
      if (!el) return;
      el.dataset.producerId = producerId;
      ensureObserver().observe(el);
    },
    unobserve(el, producerId) {
      if (el) ensureObserver().unobserve(el);
      visible.delete(producerId);
      schedule();
    },
    destroy() {
      observer?.disconnect();
      observer = null;
      if (timer) clearTimeout(timer);
      visible.clear();
    },
  };
}
