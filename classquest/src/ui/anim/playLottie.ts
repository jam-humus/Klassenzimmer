import lottie from 'lottie-web';

export function playLottieOverlay(jsonPath: string, opts?: { durationMs?: number; scale?: number }) {
  const host = document.createElement('div');
  host.setAttribute('data-lottie-overlay', '');
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '1300',
    display: 'grid',
    placeItems: 'center',
  } as const);
  const container = document.createElement('div');
  const scale = opts?.scale ?? 1;
  Object.assign(container.style, { width: `${320 * scale}px`, height: `${320 * scale}px` });
  host.appendChild(container);
  document.body.appendChild(host);

  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: jsonPath,
  });
  const timeout = setTimeout(() => {
    anim.destroy();
    host.remove();
  }, opts?.durationMs ?? 1400);

  return () => {
    clearTimeout(timeout);
    anim.destroy();
    host.remove();
  };
}
